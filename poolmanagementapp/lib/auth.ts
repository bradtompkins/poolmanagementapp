import CredentialsProvider from 'next-auth/providers/credentials'
import { getServerSession as nextAuthGetServerSession } from 'next-auth'
import type { NextAuthOptions, Session } from 'next-auth'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import type { UserRole as AppUserRole } from '@/lib/session-service'

// Re-export the app-level UserRole type for convenience
export type { AppUserRole as UserRole }

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          return null
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      session.user.role = token.role
      return session
    },
  },
  session: {
    strategy: 'jwt',
  },
}

/**
 * Wrapper around NextAuth's getServerSession that injects authOptions automatically.
 */
export function getServerSession(): Promise<Session | null> {
  return nextAuthGetServerSession(authOptions)
}

/**
 * Maps a NextAuth session to the lowercase UserRole string used by the session service.
 * Returns 'public' for unauthenticated (null) sessions.
 */
export function resolveRole(session: Session | null): AppUserRole {
  if (!session) {
    return 'public'
  }

  switch (session.user.role) {
    case 'ADMIN':
      return 'admin'
    case 'STAFF':
      return 'staff'
    default:
      return 'public'
  }
}
