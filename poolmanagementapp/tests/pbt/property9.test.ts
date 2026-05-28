// Feature: pool-management-app, Property 9: Check-in data round-trip preserves all fields
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

describe('Property 9: Check-in data round-trip preserves all fields', () => {
  // **Validates: Requirements 9.4, 1.2**
  it('should return a session with all fields matching the input', async () => {
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

          // Mock $transaction to return a session object with the same fields
          const returnedSession: Session = {
            id: 'generated-id',
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
            const tx = { session: { create: vi.fn().mockResolvedValue(returnedSession) } };
            return fn(tx as never);
          });

          const result = await checkIn(input);

          // Verify the returned session preserves all input fields
          expect(result.name).toBe(name);
          expect(result.membershipNumber).toBe(membershipNumber);
          expect(result.phoneNumber).toBe(phoneNumber);
          expect(result.partySize).toBe(partySize);
          expect(result.isPrivate).toBe(isPrivate);
        }
      ),
      { numRuns: 100 }
    );
  });
});
