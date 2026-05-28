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

// Mock auth module to control role resolution
vi.mock('@/lib/auth', () => ({
  getServerSession: vi.fn(),
  resolveRole: vi.fn(),
  authOptions: {},
}));

import { prisma } from '@/lib/prisma';
import { getServerSession, resolveRole } from '@/lib/auth';
import { GET } from '@/app/api/sessions/route';

const mockFindMany = vi.mocked(prisma.session.findMany);
const mockGetServerSession = vi.mocked(getServerSession);
const mockResolveRole = vi.mocked(resolveRole);

const publicSession = {
  id: 'pub-1',
  name: 'Alice Public',
  membershipNumber: '11111',
  phoneNumber: '5551111111',
  partySize: 3,
  isPrivate: false,
  checkedInAt: new Date('2024-01-01T10:00:00Z'),
  checkedOutAt: null,
  isActive: true,
};

const privateSession = {
  id: 'priv-1',
  name: 'Bob Private',
  membershipNumber: '22222',
  phoneNumber: '5552222222',
  partySize: 2,
  isPrivate: true,
  checkedInAt: new Date('2024-01-01T11:00:00Z'),
  checkedOutAt: null,
  isActive: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/sessions — Role-Based Filtering Integration', () => {
  it('Public role: returns only non-private sessions without phoneNumber', async () => {
    mockGetServerSession.mockResolvedValue(null);
    mockResolveRole.mockReturnValue('public');
    // Public query filters to non-private only
    mockFindMany.mockResolvedValue([publicSession]);

    const response = await GET();

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('pub-1');
    expect(data[0].isPrivate).toBe(false);
    // No phoneNumber for public
    expect(data[0].phoneNumber).toBeUndefined();
  });

  it('Staff role: returns all sessions without phoneNumber', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { name: 'Staff User', email: 'staff@pool.com', role: 'STAFF' },
      expires: '2099-01-01',
    });
    mockResolveRole.mockReturnValue('staff');
    // Staff query returns all active sessions
    mockFindMany.mockResolvedValue([publicSession, privateSession]);

    const response = await GET();

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data).toHaveLength(2);
    // Includes private session
    expect(data.some((s: { isPrivate: boolean }) => s.isPrivate)).toBe(true);
    // No phoneNumber for staff
    data.forEach((s: { phoneNumber?: string }) => {
      expect(s.phoneNumber).toBeUndefined();
    });
  });

  it('Admin role: returns all sessions with phoneNumber', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { name: 'Admin User', email: 'admin@pool.com', role: 'ADMIN' },
      expires: '2099-01-01',
    });
    mockResolveRole.mockReturnValue('admin');
    // Admin query returns all active sessions
    mockFindMany.mockResolvedValue([publicSession, privateSession]);

    const response = await GET();

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data).toHaveLength(2);
    // Includes private session
    expect(data.some((s: { isPrivate: boolean }) => s.isPrivate)).toBe(true);
    // Admin gets phoneNumber
    data.forEach((s: { phoneNumber?: string }) => {
      expect(s.phoneNumber).toBeDefined();
    });
    expect(data[0].phoneNumber).toBe('5551111111');
    expect(data[1].phoneNumber).toBe('5552222222');
  });
});
