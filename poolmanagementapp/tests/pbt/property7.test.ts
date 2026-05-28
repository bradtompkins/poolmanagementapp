// Feature: pool-management-app, Property 7: Returning member detection prevents duplicate active sessions
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

// Arbitraries
const validMembershipNumber = fc.stringOf(fc.constantFrom('0','1','2','3','4','5','6','7','8','9'), { minLength: 1, maxLength: 10 });
const validName = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
const validPhoneNumber = fc.stringOf(fc.constantFrom('0','1','2','3','4','5','6','7','8','9'), { minLength: 10, maxLength: 10 });
const validPartySize = fc.integer({ min: 1, max: 20 });
const validIsPrivate = fc.boolean();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Property 7: Returning member detection prevents duplicate active sessions', () => {
  // **Validates: Requirements 2.1**
  it('should return the existing active session for a membership number that is already checked in', async () => {
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

          const existingSession: Session = {
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

          // Mock findFirst to return the existing active session
          mockSession.findFirst.mockResolvedValue(existingSession);

          const result = await findActiveSession(membershipNumber);

          // Should return the existing session (not null)
          expect(result).not.toBeNull();
          expect(result!.id).toBe(sessionId);
          expect(result!.membershipNumber).toBe(membershipNumber);
          expect(result!.isActive).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
