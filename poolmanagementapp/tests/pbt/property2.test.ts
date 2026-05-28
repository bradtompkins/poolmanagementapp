// Feature: pool-management-app, Property 2: Invalid check-in inputs are rejected without side effects
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';

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
import { validateCheckIn } from '@/lib/validation';

const mockTransaction = vi.mocked(prisma.$transaction);

// Invalid input generators — at least one field fails validation
const emptyName = fc.constant('');
const validName = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);

const nonNumericMembership = fc.string({ minLength: 1, maxLength: 10 }).filter(s => !/^\d+$/.test(s));
const validMembershipNumber = fc.stringOf(fc.constantFrom('0','1','2','3','4','5','6','7','8','9'), { minLength: 1, maxLength: 10 });

const invalidPhoneNumber = fc.oneof(
  fc.stringOf(fc.constantFrom('0','1','2','3','4','5','6','7','8','9'), { minLength: 1, maxLength: 9 }),
  fc.stringOf(fc.constantFrom('0','1','2','3','4','5','6','7','8','9'), { minLength: 11, maxLength: 15 }),
  fc.string({ minLength: 10, maxLength: 10 }).filter(s => !/^\d{10}$/.test(s))
);
const validPhoneNumber = fc.stringOf(fc.constantFrom('0','1','2','3','4','5','6','7','8','9'), { minLength: 10, maxLength: 10 });

const invalidPartySize = fc.oneof(
  fc.integer({ min: -100, max: 0 }),
  fc.integer({ min: 21, max: 200 })
);
const validPartySize = fc.integer({ min: 1, max: 20 });

const validIsPrivate = fc.boolean();

// Generate an input with at least one invalid field
const invalidCheckInInput = fc.oneof(
  // Invalid name (empty)
  fc.tuple(emptyName, validMembershipNumber, validPhoneNumber, validPartySize, validIsPrivate)
    .map(([name, membershipNumber, phoneNumber, partySize, isPrivate]) => ({
      name, membershipNumber, phoneNumber, partySize, isPrivate,
    })),
  // Invalid membership number (non-numeric)
  fc.tuple(validName, nonNumericMembership, validPhoneNumber, validPartySize, validIsPrivate)
    .map(([name, membershipNumber, phoneNumber, partySize, isPrivate]) => ({
      name, membershipNumber, phoneNumber, partySize, isPrivate,
    })),
  // Invalid phone number (wrong length)
  fc.tuple(validName, validMembershipNumber, invalidPhoneNumber, validPartySize, validIsPrivate)
    .map(([name, membershipNumber, phoneNumber, partySize, isPrivate]) => ({
      name, membershipNumber, phoneNumber, partySize, isPrivate,
    })),
  // Invalid party size (out of range)
  fc.tuple(validName, validMembershipNumber, validPhoneNumber, invalidPartySize, validIsPrivate)
    .map(([name, membershipNumber, phoneNumber, partySize, isPrivate]) => ({
      name, membershipNumber, phoneNumber, partySize, isPrivate,
    }))
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Property 2: Invalid check-in inputs are rejected without side effects', () => {
  // **Validates: Requirements 1.3, 1.4, 1.5, 1.6, 1.7, 1.2 (criterion 3)**
  it('should reject invalid inputs and never call the session service', () => {
    fc.assert(
      fc.property(
        invalidCheckInInput,
        (input) => {
          vi.clearAllMocks();

          const result = validateCheckIn(input);

          // Validation must fail
          expect(result.success).toBe(false);

          // No database interaction should occur
          expect(mockTransaction).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});
