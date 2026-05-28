// Feature: pool-management-app, Property 6: Admin and Staff roles receive all session data
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

describe('Property 6: Admin and Staff roles receive all session data', () => {
  // **Validates: Requirements 5.1, 5.2, 6.4**
  it('admin receives all sessions with phoneNumber; staff receives all sessions without phoneNumber', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(sessionArbitrary, { minLength: 1, maxLength: 20 }),
        async (sessions) => {
          mockSession.findMany.mockReset();

          // Both admin and staff see all sessions (no isPrivate filter)
          mockSession.findMany.mockResolvedValue(sessions);

          const adminResult = await getActiveSessions('admin');

          // Reset mock for staff call
          mockSession.findMany.mockResolvedValue(sessions);

          const staffResult = await getActiveSessions('staff');

          // Admin should see all sessions with phoneNumber
          expect(adminResult).toHaveLength(sessions.length);
          for (let i = 0; i < adminResult.length; i++) {
            expect(adminResult[i].phoneNumber).toBe(sessions[i].phoneNumber);
            expect(adminResult[i].id).toBe(sessions[i].id);
          }

          // Staff should see all sessions without phoneNumber
          expect(staffResult).toHaveLength(sessions.length);
          for (let i = 0; i < staffResult.length; i++) {
            expect(staffResult[i].phoneNumber).toBeUndefined();
            expect(staffResult[i].id).toBe(sessions[i].id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
