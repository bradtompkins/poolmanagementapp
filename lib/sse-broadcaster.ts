import type { UserRole, SessionView } from '@/lib/session-service';

interface ClientEntry {
  role: UserRole;
  writer: WritableStreamDefaultWriter<Uint8Array>;
}

interface PoolStatusEvent {
  totalOccupancy: number;
  sessions: SessionView[];
  timestamp: Date;
}

const encoder = new TextEncoder();

/**
 * Filters a full session list according to the given role, applying the same
 * visibility matrix as `getActiveSessions` in session-service.ts.
 *
 * - public: only non-private sessions; no phoneNumber
 * - staff:  all sessions; no phoneNumber
 * - admin:  all sessions; with phoneNumber
 */
function filterSessionsForRole(sessions: SessionView[], role: UserRole): SessionView[] {
  return sessions
    .filter((s) => role !== 'public' || !s.isPrivate)
    .map((s) => {
      const view: SessionView = {
        id: s.id,
        name: s.name,
        membershipNumber: s.membershipNumber,
        partySize: s.partySize,
        isPrivate: s.isPrivate,
        checkedInAt: s.checkedInAt,
      };

      if (role === 'admin') {
        view.phoneNumber = s.phoneNumber;
      }

      return view;
    });
}

class SSEBroadcaster {
  private clients: Map<string, ClientEntry> = new Map();

  /**
   * Registers a new SSE client with its role and stream writer.
   */
  subscribe(
    clientId: string,
    role: UserRole,
    writer: WritableStreamDefaultWriter<Uint8Array>,
  ): void {
    this.clients.set(clientId, { role, writer });
  }

  /**
   * Removes a client from the broadcaster.
   */
  unsubscribe(clientId: string): void {
    this.clients.delete(clientId);
  }

  /**
   * Broadcasts a pool status event to all connected clients.
   *
   * @param allSessions - The full unfiltered list of active sessions.
   *
   * `totalOccupancy` is always the sum of ALL active party sizes (including
   * private sessions) and is the same for every role.
   *
   * Each client receives a role-filtered session list.
   */
  async broadcast(allSessions: SessionView[]): Promise<void> {
    const totalOccupancy = allSessions.reduce((sum, s) => sum + s.partySize, 0);
    const timestamp = new Date();

    const promises: Promise<void>[] = [];

    for (const [clientId, entry] of this.clients) {
      const filteredSessions = filterSessionsForRole(allSessions, entry.role);

      const event: PoolStatusEvent = {
        totalOccupancy,
        sessions: filteredSessions,
        timestamp,
      };

      const sseString = `data: ${JSON.stringify(event)}\n\n`;
      const chunk = encoder.encode(sseString);

      const writePromise = entry.writer.write(chunk).catch(() => {
        // Client disconnected — remove it without crashing
        this.unsubscribe(clientId);
      });

      promises.push(writePromise);
    }

    await Promise.all(promises);
  }
}

export const sseBroadcaster = new SSEBroadcaster();
export { SSEBroadcaster };
export type { PoolStatusEvent, ClientEntry };
