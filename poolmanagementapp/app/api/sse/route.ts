import { getServerSession, resolveRole } from '@/lib/auth';
import { getActiveSessions } from '@/lib/session-service';
import { sseBroadcaster } from '@/lib/sse-broadcaster';

const encoder = new TextEncoder();

export async function GET(request: Request): Promise<Response> {
  // 1. Resolve the caller's role
  const session = await getServerSession();
  const role = resolveRole(session);

  // 2. Set up the transform stream and register the client
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const clientId = crypto.randomUUID();

  sseBroadcaster.subscribe(clientId, role, writer);

  // 3. Send the current pool state immediately on connect (or on reconnect via Last-Event-ID)
  const sendCurrentState = async (): Promise<void> => {
    const allSessions = await getActiveSessions('admin');
    const totalOccupancy = allSessions.reduce((sum, s) => sum + s.partySize, 0);

    // Filter sessions for this client's role
    const filteredSessions = allSessions
      .filter((s) => role !== 'public' || !s.isPrivate)
      .map((s) => {
        const view = {
          id: s.id,
          name: s.name,
          membershipNumber: s.membershipNumber,
          partySize: s.partySize,
          isPrivate: s.isPrivate,
          checkedInAt: s.checkedInAt,
          ...(role === 'admin' ? { phoneNumber: s.phoneNumber } : {}),
        };
        return view;
      });

    const payload = JSON.stringify({ totalOccupancy, sessions: filteredSessions, timestamp: new Date() });
    const sseString = `data: ${payload}\n\n`;

    try {
      await writer.write(encoder.encode(sseString));
    } catch {
      // Client already disconnected before we could write
      sseBroadcaster.unsubscribe(clientId);
    }
  };

  // Send initial state (also handles Last-Event-ID reconnection)
  void sendCurrentState();

  // 4. Handle client disconnect
  request.signal.addEventListener('abort', () => {
    sseBroadcaster.unsubscribe(clientId);
    writer.close().catch(() => {
      // Writer may already be closed — ignore
    });
  });

  // 5. Return the SSE response (must use native Response, not NextResponse)
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
