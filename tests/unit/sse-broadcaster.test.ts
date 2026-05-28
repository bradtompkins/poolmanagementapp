import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SSEBroadcaster } from '@/lib/sse-broadcaster';
import type { SessionView } from '@/lib/session-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a mock WritableStreamDefaultWriter whose `write` method is a vi.fn()
 * that resolves successfully by default.
 */
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

/** Builds a minimal SessionView for testing. */
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

const encoder = new TextEncoder();

/**
 * Decodes the first write call on a mock writer and parses the JSON payload
 * from the SSE `data:` line.
 */
function decodeWrittenEvent(writeFn: ReturnType<typeof vi.fn>): {
  totalOccupancy: number;
  sessions: SessionView[];
  timestamp: string;
} {
  expect(writeFn).toHaveBeenCalled();
  const chunk: Uint8Array = writeFn.mock.calls[0][0];
  const raw = new TextDecoder().decode(chunk);
  // SSE format: "data: {...}\n\n"
  const jsonStr = raw.replace(/^data: /, '').trim();
  return JSON.parse(jsonStr);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SSEBroadcaster', () => {
  let broadcaster: SSEBroadcaster;

  beforeEach(() => {
    broadcaster = new SSEBroadcaster();
  });

  // -------------------------------------------------------------------------
  // subscribe / unsubscribe
  // -------------------------------------------------------------------------

  describe('subscribe', () => {
    it('adds a client so it receives broadcast events', async () => {
      const writeFn = vi.fn().mockResolvedValue(undefined);
      const writer = makeMockWriter(writeFn);

      broadcaster.subscribe('client-1', 'public', writer);

      const sessions = [buildSession()];
      await broadcaster.broadcast(sessions);

      expect(writeFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('unsubscribe', () => {
    it('removes a client so it no longer receives broadcast events', async () => {
      const writeFn = vi.fn().mockResolvedValue(undefined);
      const writer = makeMockWriter(writeFn);

      broadcaster.subscribe('client-1', 'public', writer);
      broadcaster.unsubscribe('client-1');

      await broadcaster.broadcast([buildSession()]);

      expect(writeFn).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // broadcast — delivery
  // -------------------------------------------------------------------------

  describe('broadcast', () => {
    it('delivers events to all connected clients', async () => {
      const writeFn1 = vi.fn().mockResolvedValue(undefined);
      const writeFn2 = vi.fn().mockResolvedValue(undefined);

      broadcaster.subscribe('client-1', 'public', makeMockWriter(writeFn1));
      broadcaster.subscribe('client-2', 'staff', makeMockWriter(writeFn2));

      await broadcaster.broadcast([buildSession()]);

      expect(writeFn1).toHaveBeenCalledTimes(1);
      expect(writeFn2).toHaveBeenCalledTimes(1);
    });

    it('encodes the payload as a valid SSE data line', async () => {
      const writeFn = vi.fn().mockResolvedValue(undefined);
      broadcaster.subscribe('client-1', 'admin', makeMockWriter(writeFn));

      await broadcaster.broadcast([buildSession()]);

      const chunk: Uint8Array = writeFn.mock.calls[0][0];
      const raw = new TextDecoder().decode(chunk);
      expect(raw).toMatch(/^data: \{.*\}\n\n$/);
    });

    // -----------------------------------------------------------------------
    // Role filtering — public
    // -----------------------------------------------------------------------

    it('filters out private sessions for public role clients', async () => {
      const writeFn = vi.fn().mockResolvedValue(undefined);
      broadcaster.subscribe('client-pub', 'public', makeMockWriter(writeFn));

      const sessions = [
        buildSession({ id: 's1', isPrivate: false }),
        buildSession({ id: 's2', isPrivate: true, name: 'Hidden' }),
      ];

      await broadcaster.broadcast(sessions);

      const payload = decodeWrittenEvent(writeFn);
      expect(payload.sessions).toHaveLength(1);
      expect(payload.sessions[0].id).toBe('s1');
      expect(payload.sessions.every((s) => !s.isPrivate)).toBe(true);
    });

    it('omits phoneNumber for public role clients', async () => {
      const writeFn = vi.fn().mockResolvedValue(undefined);
      broadcaster.subscribe('client-pub', 'public', makeMockWriter(writeFn));

      await broadcaster.broadcast([buildSession({ isPrivate: false })]);

      const payload = decodeWrittenEvent(writeFn);
      payload.sessions.forEach((s) => {
        expect(s.phoneNumber).toBeUndefined();
      });
    });

    // -----------------------------------------------------------------------
    // Role filtering — staff
    // -----------------------------------------------------------------------

    it('includes private sessions for staff role clients', async () => {
      const writeFn = vi.fn().mockResolvedValue(undefined);
      broadcaster.subscribe('client-staff', 'staff', makeMockWriter(writeFn));

      const sessions = [
        buildSession({ id: 's1', isPrivate: false }),
        buildSession({ id: 's2', isPrivate: true }),
      ];

      await broadcaster.broadcast(sessions);

      const payload = decodeWrittenEvent(writeFn);
      expect(payload.sessions).toHaveLength(2);
    });

    it('omits phoneNumber for staff role clients', async () => {
      const writeFn = vi.fn().mockResolvedValue(undefined);
      broadcaster.subscribe('client-staff', 'staff', makeMockWriter(writeFn));

      await broadcaster.broadcast([buildSession()]);

      const payload = decodeWrittenEvent(writeFn);
      payload.sessions.forEach((s) => {
        expect(s.phoneNumber).toBeUndefined();
      });
    });

    // -----------------------------------------------------------------------
    // Role filtering — admin
    // -----------------------------------------------------------------------

    it('includes private sessions for admin role clients', async () => {
      const writeFn = vi.fn().mockResolvedValue(undefined);
      broadcaster.subscribe('client-admin', 'admin', makeMockWriter(writeFn));

      const sessions = [
        buildSession({ id: 's1', isPrivate: false }),
        buildSession({ id: 's2', isPrivate: true }),
      ];

      await broadcaster.broadcast(sessions);

      const payload = decodeWrittenEvent(writeFn);
      expect(payload.sessions).toHaveLength(2);
    });

    it('includes phoneNumber for admin role clients', async () => {
      const writeFn = vi.fn().mockResolvedValue(undefined);
      broadcaster.subscribe('client-admin', 'admin', makeMockWriter(writeFn));

      await broadcaster.broadcast([buildSession({ phoneNumber: '5559876543' })]);

      const payload = decodeWrittenEvent(writeFn);
      expect(payload.sessions[0].phoneNumber).toBe('5559876543');
    });

    // -----------------------------------------------------------------------
    // totalOccupancy
    // -----------------------------------------------------------------------

    it('totalOccupancy includes party sizes from private sessions', async () => {
      const writeFn = vi.fn().mockResolvedValue(undefined);
      // Use public role — private sessions are filtered from the list but must
      // still be counted in totalOccupancy
      broadcaster.subscribe('client-pub', 'public', makeMockWriter(writeFn));

      const sessions = [
        buildSession({ id: 's1', partySize: 3, isPrivate: false }),
        buildSession({ id: 's2', partySize: 4, isPrivate: true }),
      ];

      await broadcaster.broadcast(sessions);

      const payload = decodeWrittenEvent(writeFn);
      // totalOccupancy = 3 + 4 = 7, even though the public client only sees s1
      expect(payload.totalOccupancy).toBe(7);
      expect(payload.sessions).toHaveLength(1);
    });

    it('totalOccupancy is the same across all roles for the same session set', async () => {
      const writeFnPub = vi.fn().mockResolvedValue(undefined);
      const writeFnAdmin = vi.fn().mockResolvedValue(undefined);

      broadcaster.subscribe('client-pub', 'public', makeMockWriter(writeFnPub));
      broadcaster.subscribe('client-admin', 'admin', makeMockWriter(writeFnAdmin));

      const sessions = [
        buildSession({ id: 's1', partySize: 2, isPrivate: false }),
        buildSession({ id: 's2', partySize: 5, isPrivate: true }),
      ];

      await broadcaster.broadcast(sessions);

      const pubPayload = decodeWrittenEvent(writeFnPub);
      const adminPayload = decodeWrittenEvent(writeFnAdmin);

      expect(pubPayload.totalOccupancy).toBe(7);
      expect(adminPayload.totalOccupancy).toBe(7);
    });

    // -----------------------------------------------------------------------
    // Error handling
    // -----------------------------------------------------------------------

    it('handles write errors gracefully — removes disconnected client without crashing', async () => {
      const failingWriteFn = vi.fn().mockRejectedValue(new Error('stream closed'));
      const goodWriteFn = vi.fn().mockResolvedValue(undefined);

      broadcaster.subscribe('client-bad', 'public', makeMockWriter(failingWriteFn));
      broadcaster.subscribe('client-good', 'staff', makeMockWriter(goodWriteFn));

      // Should not throw
      await expect(broadcaster.broadcast([buildSession()])).resolves.not.toThrow();

      // Good client still received the event
      expect(goodWriteFn).toHaveBeenCalledTimes(1);

      // Disconnected client is removed — a second broadcast should not call it again
      vi.clearAllMocks();
      await broadcaster.broadcast([buildSession()]);
      expect(failingWriteFn).not.toHaveBeenCalled();
      expect(goodWriteFn).toHaveBeenCalledTimes(1);
    });
  });
});
