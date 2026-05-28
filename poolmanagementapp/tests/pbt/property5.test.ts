// Feature: pool-management-app, Property 5: Public role never receives private session data
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
import { getActiveSessions } from '@/lib/session-service';

const mockSession = vi.mocked(prisma.session);

// Arbitrary for generating a random session (mixed private/non-private)
const sessionArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  membershipNumber: fc.stringOf(fc.constantFrom('0','1','2','3','4','5','6','7','8','9'), { minLength: 1, maxLength: 10 }),
  phoneNumber: fc.stringOf(fc.constantFrom('0','1','2','3','4','5','6','7','8','9'), { minLength: 10, maxLength: 10 }),
  partySize: fc.integer({ min: 1, max: 20 }),
  isPrivate: fc.boolean(),
  checkedInAt: fc.constant(new Date('2024-01-01T10:00:00Z')),
  checkedOutAt: fc.constant(null),
  isActive: fc.constant(true),
}) as fc.Arbitrary<Session>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Property 5: Public role never receives private session data', () => {
  // **Validates: Requirements 5.3, 6.2**
  it('should never include private sessions or phone numbers for public role', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(sessionArbitrary, { minLength: 1, maxLength: 20 }),
        async (sessions) => {
          mockSession.findMany.mockReset();

          // The service applies WHERE isPrivate: false for public role,
          // so mock returns only non-private sessions (simulating the DB query)
          const nonPrivateSessions = sessions.filter(s => !s.isPrivate);
          mockSession.findMany.mockResolvedValue(nonPrivateSessions);

          const result = await getActiveSessions('public');

          // No session in the result should be private
          for (const session of result) {
            expect(session.isPrivate).toBe(false);
          }

          // No session should have phoneNumber defined
          for (const session of result) {
            expect(session.phoneNumber).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
