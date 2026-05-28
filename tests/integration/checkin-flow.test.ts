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
import { POST } from '@/app/api/sessions/checkin/route';

const mockFindFirst = vi.mocked(prisma.session.findFirst);
const mockFindMany = vi.mocked(prisma.session.findMany);
const mockTransaction = vi.mocked(prisma.$transaction);

function makeRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/sessions/checkin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validInput = {
  name: 'Jane Doe',
  membershipNumber: '12345',
  phoneNumber: '5551234567',
  partySize: 2,
  isPrivate: false,
};

const createdSession = {
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

describe('POST /api/sessions/checkin — Integration', () => {
  it('returns HTTP 201 with session data for a valid check-in', async () => {
    // No existing active session
    mockFindFirst.mockResolvedValue(null);
    // Transaction creates the session
    mockTransaction.mockImplementation(async (fn) => {
      const tx = { session: { create: vi.fn().mockResolvedValue(createdSession) } };
      return fn(tx as never);
    });
    // getActiveSessions calls findMany after check-in
    mockFindMany.mockResolvedValue([createdSession]);

    const request = makeRequest(validInput);
    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.name).toBe('Jane Doe');
    expect(data.membershipNumber).toBe('12345');
    expect(data.id).toBe('session-abc');
  });

  it('returns HTTP 400 with field errors for invalid data', async () => {
    const invalidInput = {
      name: '',
      membershipNumber: 'abc',
      phoneNumber: '123',
      partySize: 0,
      isPrivate: false,
    };

    const request = makeRequest(invalidInput);
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('validation_error');
    expect(data.fields).toBeDefined();
    // Should have errors for name, membershipNumber, phoneNumber, partySize
    expect(data.fields.name).toBeDefined();
    expect(data.fields.membershipNumber).toBeDefined();
    expect(data.fields.phoneNumber).toBeDefined();
    expect(data.fields.partySize).toBeDefined();
  });

  it('returns HTTP 409 when membership number already has an active session', async () => {
    // Existing active session found
    mockFindFirst.mockResolvedValue(createdSession as never);

    const request = makeRequest(validInput);
    const response = await POST(request);

    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.status).toBe('already_checked_in');
    expect(data.sessionId).toBe('session-abc');
  });
});
