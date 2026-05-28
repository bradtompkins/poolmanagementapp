import { prisma } from '@/lib/prisma';
import { CheckInInput } from '@/lib/validation';
import type { Session } from '@/app/generated/prisma/client';

export type UserRole = 'admin' | 'staff' | 'public';

export interface SessionView {
  id: string;
  name: string;
  membershipNumber: string;
  phoneNumber?: string; // only for admin/staff
  partySize: number;
  isPrivate: boolean;
  checkedInAt: Date;
}

export interface CheckOutResult {
  status: 'checked_out' | 'not_found';
  message: string;
}

/**
 * Creates a new session record with isActive=true using a Prisma transaction.
 */
export async function checkIn(data: CheckInInput): Promise<Session> {
  return prisma.$transaction(async (tx) => {
    return tx.session.create({
      data: {
        name: data.name,
        membershipNumber: data.membershipNumber,
        phoneNumber: data.phoneNumber || null,
        partySize: data.partySize,
        isPrivate: data.isPrivate,
        isActive: true,
      },
    });
  });
}

/**
 * Finds the active session for a membership number and marks it as checked out.
 * Returns not_found if no active session exists.
 */
export async function checkOut(membershipNumber: string): Promise<CheckOutResult> {
  const activeSession = await findActiveSession(membershipNumber);

  if (!activeSession) {
    return { status: 'not_found', message: 'No active session found' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.session.update({
      where: { id: activeSession.id },
      data: {
        checkedOutAt: new Date(),
        isActive: false,
      },
    });
  });

  return { status: 'checked_out', message: 'Checked out successfully' };
}

/**
 * Queries for a session where membershipNumber matches and isActive=true.
 */
export async function findActiveSession(membershipNumber: string): Promise<Session | null> {
  return prisma.session.findFirst({
    where: {
      membershipNumber,
      isActive: true,
    },
  });
}

/**
 * Returns active sessions filtered and shaped according to the caller's role.
 *
 * Role visibility matrix:
 * - public: only non-private sessions; no phoneNumber
 * - staff:  all sessions (including private); no phoneNumber
 * - admin:  all sessions (including private); includes phoneNumber
 */
export async function getActiveSessions(role: UserRole): Promise<SessionView[]> {
  const where = role === 'public'
    ? { isActive: true, isPrivate: false }
    : { isActive: true };

  const sessions = await prisma.session.findMany({ where });

  return sessions.map((session) => {
    const view: SessionView = {
      id: session.id,
      name: session.name,
      membershipNumber: session.membershipNumber,
      partySize: session.partySize,
      isPrivate: session.isPrivate,
      checkedInAt: session.checkedInAt,
    };

    if (role === 'admin') {
      view.phoneNumber = session.phoneNumber ?? undefined;
    }

    return view;
  });
}
