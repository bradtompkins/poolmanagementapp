import { NextResponse } from 'next/server';
import { validateCheckOut } from '@/lib/validation';
import { checkOut, getActiveSessions } from '@/lib/session-service';
import { sseBroadcaster } from '@/lib/sse-broadcaster';

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'validation_error', fields: { body: 'Invalid JSON' } },
      { status: 400 },
    );
  }

  const validation = validateCheckOut(body);

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

  try {
    const result = await checkOut(data.membershipNumber);

    if (result.status === 'not_found') {
      return NextResponse.json(
        { status: 'not_found', message: result.message },
        { status: 404 },
      );
    }

    // result.status === 'checked_out'
    const sessions = await getActiveSessions('admin');
    await sseBroadcaster.broadcast(sessions);

    return NextResponse.json(
      { status: 'checked_out', message: result.message },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      {
        error: 'database_error',
        message: 'Failed to persist check-out. Please try again.',
      },
      { status: 500 },
    );
  }
}
