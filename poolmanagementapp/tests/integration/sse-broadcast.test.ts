import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SSEBroadcaster } from '@/lib/sse-broadcaster';
import type { SessionView } from '@/lib/session-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockWriter(
  writeFn: ReturnType<typeof vi.fn> = vi.fn().mockResolvedValue(undefined),
): WritableStreamDefaultWriter<Uint8Array> {
  return {
    write: writeFn,
    close: vi.fn(),
    abort: vi.fn(),
    releaseLock: vi.fn(),
    closed: Promise.resolve(undefined),
    desiredSize: null,
    ready: Promise.resolve(undefined),
  } as unknown as WritableStreamDefaultWriter<Uint8Array>;
}

function buildSession(overrides: Partial<SessionView> = {}): SessionView {
  return {
    id: 'session-1',
    name: 'Jane Doe',
    membershipNumber: '12345',
    phoneNumber: '5551234567',
    partySize: 2,
    isPrivate: false,
    checkedInAt: new Date('2024-01-01T10:00:00Z'),
    ...overrides,
  };
}

function decodeWrittenEvent(writeFn: ReturnType<typeof vi.fn>): {
  totalOccupancy: number;
  sessions: SessionView[];
  timestamp: string;
} {
  expect(writeFn).toHaveBeenCalled();
  const chunk: Uint8Array = writeFn.mock.calls[0][0];
  const raw = new TextDecoder().decode(chunk);
  const jsonStr = raw.replace(/^data: /, '').trim();
  return JSON.parse(jsonStr);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SSE Broadcast — Integration', () => {
  let broadcaster: SSEBroadcaster;

  beforeEach(() => {
    broadcaster = new SSEBroadcaster();
  });

  it('delivers role-filtered data to multiple clients simultaneously', async () => {
    const publicWriteFn = vi.fn().mockResolvedValue(undefined);
    const staffWriteFn = vi.fn().mockResolvedValue(undefined);
    const adminWriteFn = vi.fn().mockResolvedValue(undefined);

    broadcaster.subscribe('client-public', 'public', makeMockWriter(publicWriteFn));
    broadcaster.subscribe('client-staff', 'staff', makeMockWriter(staffWriteFn));
    broadcaster.subscribe('client-admin', 'admin', makeMockWriter(adminWriteFn));

    const sessions = [
      buildSession({ id: 's1', isPrivate: false, partySize: 3 }),
      buildSession({ id: 's2', isPrivate: true, partySize: 4, name: 'Private Person' }),
    ];

    await broadcaster.broadcast(sessions);

    // Public client: only non-private sessions, no phoneNumber
    const publicPayload = decodeWrittenEvent(publicWriteFn);
    expect(publicPayload.sessions).toHaveLength(1);
    expect(publicPayload.sessions[0].id).toBe('s1');
    expect(publicPayload.sessions[0].phoneNumber).toBeUndefined();
    // Total occupancy still includes private sessions
    expect(publicPayload.totalOccupancy).toBe(7);

    // Staff client: all sessions, no phoneNumber
    const staffPayload = decodeWrittenEvent(staffWriteFn);
    expect(staffPayload.sessions).toHaveLength(2);
    staffPayload.sessions.forEach((s) => {
      expect(s.phoneNumber).toBeUndefined();
    });
    expect(staffPayload.totalOccupancy).toBe(7);

    // Admin client: all sessions, with phoneNumber
    const adminPayload = decodeWrittenEvent(adminWriteFn);
    expect(adminPayload.sessions).toHaveLength(2);
    adminPayload.sessions.forEach((s) => {
      expect(s.phoneNumber).toBeDefined();
    });
    expect(adminPayload.totalOccupancy).toBe(7);
  });

  it('broadcast delivers events promptly (simulating within 3 seconds requirement)', async () => {
    const writeFn = vi.fn().mockResolvedValue(undefined);
    broadcaster.subscribe('client-1', 'admin', makeMockWriter(writeFn));

    const sessions = [buildSession()];

    const startTime = Date.now();
    await broadcaster.broadcast(sessions);
    const elapsed = Date.now() - startTime;

    // Broadcast should complete well within 3 seconds (typically < 10ms)
    expect(elapsed).toBeLessThan(3000);
    expect(writeFn).toHaveBeenCalledTimes(1);
  });

  it('each client receives correct totalOccupancy regardless of role filtering', async () => {
    const publicWriteFn = vi.fn().mockResolvedValue(undefined);
    const adminWriteFn = vi.fn().mockResolvedValue(undefined);

    broadcaster.subscribe('client-pub', 'public', makeMockWriter(publicWriteFn));
    broadcaster.subscribe('client-admin', 'admin', makeMockWriter(adminWriteFn));

    const sessions = [
      buildSession({ id: 's1', partySize: 5, isPrivate: false }),
      buildSession({ id: 's2', partySize: 3, isPrivate: true }),
      buildSession({ id: 's3', partySize: 2, isPrivate: true }),
    ];

    await broadcaster.broadcast(sessions);

    const publicPayload = decodeWrittenEvent(publicWriteFn);
    const adminPayload = decodeWrittenEvent(adminWriteFn);

    // Both see the same total occupancy (5 + 3 + 2 = 10)
    expect(publicPayload.totalOccupancy).toBe(10);
    expect(adminPayload.totalOccupancy).toBe(10);

    // But public only sees 1 session, admin sees all 3
    expect(publicPayload.sessions).toHaveLength(1);
    expect(adminPayload.sessions).toHaveLength(3);
  });

  it('disconnected clients are removed and do not block other clients', async () => {
    const failingWriteFn = vi.fn().mockRejectedValue(new Error('stream closed'));
    const goodWriteFn = vi.fn().mockResolvedValue(undefined);

    broadcaster.subscribe('client-bad', 'public', makeMockWriter(failingWriteFn));
    broadcaster.subscribe('client-good', 'admin', makeMockWriter(goodWriteFn));

    await broadcaster.broadcast([buildSession()]);

    // Good client still received the event
    expect(goodWriteFn).toHaveBeenCalledTimes(1);

    // Second broadcast — disconnected client should be removed
    vi.clearAllMocks();
    await broadcaster.broadcast([buildSession()]);
    expect(failingWriteFn).not.toHaveBeenCalled();
    expect(goodWriteFn).toHaveBeenCalledTimes(1);
  });
});
