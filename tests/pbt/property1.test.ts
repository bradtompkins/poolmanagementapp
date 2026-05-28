// Feature: pool-management-app, Property 1: Valid check-in creates a persisted active session
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
import { checkIn } from '@/lib/session-service';

const mockTransaction = vi.mocked(prisma.$transaction);

// Arbitraries
const validName = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
const validMembershipNumber = fc.stringOf(fc.constantFrom('0','1','2','3','4','5','6','7','8','9'), { minLength: 1, maxLength: 10 });
const validPhoneNumber = fc.stringOf(fc.constantFrom('0','1','2','3','4','5','6','7','8','9'), { minLength: 10, maxLength: 10 });
const validPartySize = fc.integer({ min: 1, max: 20 });
const validIsPrivate = fc.boolean();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Property 1: Valid check-in creates a persisted active session', () => {
  // **Validates: Requirements 1.1, 1.2, 9.1, 9.4**
  it('should create a session with all input fields and isActive: true', async () => {
    await fc.assert(
      fc.asyncProperty(
        validName,
        validMembershipNumber,
        validPhoneNumber,
        validPartySize,
        validIsPrivate,
        async (name, membershipNumber, phoneNumber, partySize, isPrivate) => {
          mockTransaction.mockReset();

          const input = { name, membershipNumber, phoneNumber, partySize, isPrivate };

          // Capture the create call arguments inside the transaction mock
          let createCalledWith: unknown = null;

          const createdSession: Session = {
            id: 'test-id',
            name,
            membershipNumber,
            phoneNumber,
            partySize,
            isPrivate,
            checkedInAt: new Date(),
            checkedOutAt: null,
            isActive: true,
          };

          mockTransaction.mockImplementation(async (fn) => {
            const tx = {
              session: {
                create: vi.fn().mockImplementation((args) => {
                  createCalledWith = args;
                  return Promise.resolve(createdSession);
                }),
              },
            };
            return fn(tx as never);
          });

          await checkIn(input);

          // Verify $transaction was called
          expect(mockTransaction).toHaveBeenCalledTimes(1);

          // Verify the create was called with correct data
          expect(createCalledWith).toEqual({
            data: {
              name,
              membershipNumber,
              phoneNumber,
              partySize,
              isPrivate,
              isActive: true,
            },
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
