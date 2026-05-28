// Feature: pool-management-app, Property 4: Occupancy equals sum of active party sizes
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

// Arbitrary for generating a random session
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

describe('Property 4: Occupancy equals sum of active party sizes', () => {
  // **Validates: Requirements 4.1, 6.3**
  it('should return sessions whose party sizes sum to the total of all generated sessions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(sessionArbitrary, { minLength: 1, maxLength: 20 }),
        async (sessions) => {
          mockSession.findMany.mockReset();

          // Admin sees all sessions, so mock returns all
          mockSession.findMany.mockResolvedValue(sessions);

          const result = await getActiveSessions('admin');

          const expectedTotal = sessions.reduce((sum, s) => sum + s.partySize, 0);
          const actualTotal = result.reduce((sum, s) => sum + s.partySize, 0);

          expect(actualTotal).toBe(expectedTotal);
        }
      ),
      { numRuns: 100 }
    );
  });
});
