import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    session: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock sse-broadcaster to avoid side effects
vi.mock('@/lib/sse-broadcaster', () => ({
  sseBroadcaster: {
    broadcast: vi.fn().mockResolvedValue(undefined),
  },
}));

import { prisma } from '@/lib/prisma';
import { POST } from '@/app/api/sessions/checkout/route';

const mockFindFirst = vi.mocked(prisma.session.findFirst);
const mockFindMany = vi.mocked(prisma.session.findMany);
const mockTransaction = vi.mocked(prisma.$transaction);

function makeRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/sessions/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const activeSession = {
  id: 'session-abc',
  name: 'Jane Doe',
  membershipNumber: '12345',
  phoneNumber: '5551234567',
  partySize: 2,
  isPrivate: false,
  checkedInAt: new Date('2024-01-01T10:00:00Z'),
  checkedOutAt: null,
  isActive: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/sessions/checkout — Integration', () => {
  it('returns HTTP 200 with checked_out for a valid check-out', async () => {
    // Active session exists
    mockFindFirst.mockResolvedValue(activeSession as never);
    // Transaction updates the session
    mockTransaction.mockImplementation(async (fn) => {
      const tx = { session: { update: vi.fn().mockResolvedValue(activeSession) } };
      return fn(tx as never);
    });
    // getActiveSessions after checkout
    mockFindMany.mockResolvedValue([]);

    const request = makeRequest({ membershipNumber: '12345' });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('checked_out');
    expect(data.message).toBe('Checked out successfully');
  });

  it('returns HTTP 404 with not_found for a non-existent session', async () => {
    // No active session
    mockFindFirst.mockResolvedValue(null);

    const request = makeRequest({ membershipNumber: '99999' });
    const response = await POST(request);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.status).toBe('not_found');
    expect(data.message).toBe('No active session found');
  });

  it('returns HTTP 400 for an invalid membership number', async () => {
    const request = makeRequest({ membershipNumber: 'abc' });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('validation_error');
    expect(data.fields.membershipNumber).toBeDefined();
  });
});
