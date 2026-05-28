import { NextResponse } from 'next/server';
import { validateCheckIn } from '@/lib/validation';
import { findActiveSession, checkIn, getActiveSessions } from '@/lib/session-service';
import { sseBroadcaster } from '@/lib/sse-broadcaster';

export async function POST(request: Request): Promise<NextResponse> {
  // 1. Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'validation_error', fields: { body: 'Invalid JSON' } },
      { status: 400 },
    );
  }

  // 2. Validate input
  const validation = validateCheckIn(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'validation_error',
        fields: Object.fromEntries(validation.errors.map((e) => [e.field, e.message])),
      },
      { status: 400 },
    );
  }

  const { data } = validation;

  // 3. Check for existing active session
  const existing = await findActiveSession(data.membershipNumber);
  if (existing) {
    return NextResponse.json(
      { status: 'already_checked_in', sessionId: existing.id },
      { status: 409 },
    );
  }

  // 4. Persist the new session
  try {
    const session = await checkIn(data);

    // Broadcast updated session list to all SSE clients
    const sessions = await getActiveSessions('admin');
    await sseBroadcaster.broadcast(sessions);

    return NextResponse.json(session, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        error: 'database_error',
        message: 'Failed to persist session. Please try again.',
      },
      { status: 500 },
    );
  }
}
