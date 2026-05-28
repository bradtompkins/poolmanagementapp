// Feature: pool-management-app, Property 3: Check-out closes the correct session
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { Session } from '@/app/generated/prisma/client';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    session: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';
import { checkOut } from '@/lib/session-service';

const mockSession = vi.mocked(prisma.session);
const mockTransaction = vi.mocked(prisma.$transaction);

// Arbitraries
const validMembershipNumber = fc.stringOf(fc.constantFrom('0','1','2','3','4','5','6','7','8','9'), { minLength: 1, maxLength: 10 });
const validName = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
const validPhoneNumber = fc.stringOf(fc.constantFrom('0','1','2','3','4','5','6','7','8','9'), { minLength: 10, maxLength: 10 });
const validPartySize = fc.integer({ min: 1, max: 20 });
const validIsPrivate = fc.boolean();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Property 3: Check-out closes the correct session', () => {
  // **Validates: Requirements 3.1, 9.2**
  it('should mark the correct session as inactive with a non-null checkedOutAt', async () => {
    await fc.assert(
      fc.asyncProperty(
        validMembershipNumber,
        validName,
        validPhoneNumber,
        validPartySize,
        validIsPrivate,
        fc.uuid(),
        async (membershipNumber, name, phoneNumber, partySize, isPrivate, sessionId) => {
          mockSession.findFirst.mockReset();
          mockTransaction.mockReset();

          const activeSession: Session = {
            id: sessionId,
            name,
            membershipNumber,
            phoneNumber,
            partySize,
            isPrivate,
            checkedInAt: new Date(),
            checkedOutAt: null,
            isActive: true,
          };

          mockSession.findFirst.mockResolvedValue(activeSession);

          // Capture the update call arguments inside the transaction
          let updateCalledWith: unknown = null;

          mockTransaction.mockImplementation(async (fn) => {
            const tx = {
              session: {
                update: vi.fn().mockImplementation((args) => {
                  updateCalledWith = args;
                  return Promise.resolve({ ...activeSession, isActive: false, checkedOutAt: new Date() });
                }),
              },
            };
            return fn(tx as never);
          });

          const result = await checkOut(membershipNumber);

          expect(result.status).toBe('checked_out');

          // Verify the update was called with the correct session ID
          expect(updateCalledWith).not.toBeNull();
          const updateArgs = updateCalledWith as { where: { id: string }; data: { isActive: boolean; checkedOutAt: Date } };
          expect(updateArgs.where.id).toBe(sessionId);
          expect(updateArgs.data.isActive).toBe(false);
          expect(updateArgs.data.checkedOutAt).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 100 }
    );
  });
});
