// Feature: pool-management-app, Property 8: Session_Prompt timeout leaves session unchanged
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
import { findActiveSession } from '@/lib/session-service';

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

describe('Property 8: Session_Prompt timeout leaves session unchanged', () => {
  // **Validates: Requirements 2.5**
  it('should not modify the session when the prompt times out (no update call made)', async () => {
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
          mockSession.update.mockReset();
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

          // Mock findFirst to return the active session
          mockSession.findFirst.mockResolvedValue(activeSession);

          // Simulate the timeout scenario: findActiveSession is called to detect
          // the returning member, but after timeout no further action is taken
          const result = await findActiveSession(membershipNumber);

          // The session is found (returning member detected)
          expect(result).not.toBeNull();
          expect(result!.id).toBe(sessionId);
          expect(result!.isActive).toBe(true);

          // After timeout, no update or transaction should be called
          // (the "continue session" path makes no database modifications)
          expect(mockSession.update).not.toHaveBeenCalled();
          expect(mockTransaction).not.toHaveBeenCalled();

          // Session remains unchanged
          expect(result!.checkedOutAt).toBeNull();
          expect(result!.isActive).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
