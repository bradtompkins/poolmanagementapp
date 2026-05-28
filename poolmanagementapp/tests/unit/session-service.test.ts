import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Session } from '@/app/generated/prisma/client';

// Mock the prisma module before importing the service
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
import {
  checkIn,
  checkOut,
  findActiveSession,
  getActiveSessions,
} from '@/lib/session-service';

// Typed mock references
const mockSession = vi.mocked(prisma.session);
const mockTransaction = vi.mocked(prisma.$transaction);

// Helper to build a mock Session object
function buildSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'session-1',
    name: 'Jane Doe',
    membershipNumber: '12345',
    phoneNumber: '5551234567',
    partySize: 2,
    isPrivate: false,
    checkedInAt: new Date('2024-01-01T10:00:00Z'),
    checkedOutAt: null,
    isActive: true,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// checkIn
// ---------------------------------------------------------------------------

describe('checkIn', () => {
  it('creates a session with correct fields', async () => {
    const input = {
      name: 'Jane Doe',
      membershipNumber: '12345',
      phoneNumber: '5551234567',
      partySize: 2,
      isPrivate: false,
    };
    const created = buildSession();

    // $transaction calls the callback with a tx object; simulate by invoking the callback
    mockTransaction.mockImplementation(async (fn) => {
      const tx = { session: { create: vi.fn().mockResolvedValue(created) } };
      return fn(tx as never);
    });

    const result = await checkIn(input);

    expect(result).toEqual(created);
    // Verify the tx.session.create was called with the right data
    const txArg = mockTransaction.mock.calls[0][0] as (tx: unknown) => Promise<Session>;
    const fakeTx = { session: { create: vi.fn().mockResolvedValue(created) } };
    await txArg(fakeTx as never);
    expect(fakeTx.session.create).toHaveBeenCalledWith({
      data: {
        name: input.name,
        membershipNumber: input.membershipNumber,
        phoneNumber: input.phoneNumber,
        partySize: input.partySize,
        isPrivate: input.isPrivate,
        isActive: true,
      },
    });
  });
});

// ---------------------------------------------------------------------------
// checkOut
// ---------------------------------------------------------------------------

describe('checkOut', () => {
  it('returns checked_out when an active session exists', async () => {
    const active = buildSession();
    mockSession.findFirst.mockResolvedValue(active);
    mockTransaction.mockImplementation(async (fn) => {
      const tx = { session: { update: vi.fn().mockResolvedValue(active) } };
      return fn(tx as never);
    });

    const result = await checkOut('12345');

    expect(result).toEqual({ status: 'checked_out', message: 'Checked out successfully' });
    expect(mockSession.findFirst).toHaveBeenCalledWith({
      where: { membershipNumber: '12345', isActive: true },
    });
  });

  it('returns not_found when no active session exists', async () => {
    mockSession.findFirst.mockResolvedValue(null);

    const result = await checkOut('99999');

    expect(result).toEqual({ status: 'not_found', message: 'No active session found' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// findActiveSession
// ---------------------------------------------------------------------------

describe('findActiveSession', () => {
  it('returns the session when an active session is found', async () => {
    const active = buildSession();
    mockSession.findFirst.mockResolvedValue(active);

    const result = await findActiveSession('12345');

    expect(result).toEqual(active);
    expect(mockSession.findFirst).toHaveBeenCalledWith({
      where: { membershipNumber: '12345', isActive: true },
    });
  });

  it('returns null when no active session is found', async () => {
    mockSession.findFirst.mockResolvedValue(null);

    const result = await findActiveSession('00000');

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getActiveSessions
// ---------------------------------------------------------------------------

describe('getActiveSessions', () => {
  const publicSession = buildSession({ id: 'pub-1', isPrivate: false });
  const privateSession = buildSession({
    id: 'priv-1',
    name: 'John Private',
    membershipNumber: '99999',
    isPrivate: true,
  });

  it('public role: excludes private sessions and omits phoneNumber', async () => {
    // public query only fetches non-private sessions
    mockSession.findMany.mockResolvedValue([publicSession]);

    const results = await getActiveSessions('public');

    expect(mockSession.findMany).toHaveBeenCalledWith({
      where: { isActive: true, isPrivate: false },
    });
    expect(results).toHaveLength(1);
    expect(results[0].isPrivate).toBe(false);
    expect(results[0].phoneNumber).toBeUndefined();
  });

  it('staff role: includes private sessions and omits phoneNumber', async () => {
    mockSession.findMany.mockResolvedValue([publicSession, privateSession]);

    const results = await getActiveSessions('staff');

    expect(mockSession.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
    });
    expect(results).toHaveLength(2);
    // Both sessions present
    expect(results.some((s) => s.isPrivate)).toBe(true);
    // No phone numbers
    results.forEach((s) => expect(s.phoneNumber).toBeUndefined());
  });

  it('admin role: includes private sessions and includes phoneNumber', async () => {
    mockSession.findMany.mockResolvedValue([publicSession, privateSession]);

    const results = await getActiveSessions('admin');

    expect(mockSession.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
    });
    expect(results).toHaveLength(2);
    // Both sessions present
    expect(results.some((s) => s.isPrivate)).toBe(true);
    // All sessions have phoneNumber
    results.forEach((s) => expect(s.phoneNumber).toBeDefined());
    expect(results[0].phoneNumber).toBe(publicSession.phoneNumber);
    expect(results[1].phoneNumber).toBe(privateSession.phoneNumber);
  });
});
