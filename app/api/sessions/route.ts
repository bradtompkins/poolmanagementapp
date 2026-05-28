import { NextResponse } from 'next/server';
import { getServerSession, resolveRole } from '@/lib/auth';
import { getActiveSessions } from '@/lib/session-service';

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession();
  const role = resolveRole(session);
  const sessions = await getActiveSessions(role);
  return NextResponse.json(sessions);
}
