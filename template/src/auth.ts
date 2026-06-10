// src/auth.ts
// NextAuth v5 (Auth.js beta) configuration — vps-next-postgres profile.
//
// Exports: handlers (GET/POST route handlers), auth (session reader), signIn, signOut.
// Used by:
//   - src/app/api/auth/[...nextauth]/route.ts  — exposes the auth endpoints
//   - src/lib/infrastructure/adapters/real/nextauth-auth.adapter.ts — getSession / signOut
//   - src/app/auth/sign-out/route.ts            — sign-out for vps-next-postgres
//   - src/lib/interfaces/actions/sign-in-vps.action.ts — credential/Google signIn

import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/infrastructure/prisma'
import { type Role } from '@/lib/domain/value-objects/role'

// ── Domain helpers ──────────────────────────────────────────────────────────

/**
 * Check whether a given email is allowed by AUTH_ALLOWED_EMAIL_DOMAIN.
 * Returns true when the env var is absent/empty (domain check OFF).
 *
 * Normalization (defense in depth):
 *   - Both email and domain are lowercased before comparison. Email domains
 *     are case-insensitive per RFC 5321, and on the OAuth path the provider
 *     (not the app) controls email casing — Google normalizes to lowercase
 *     in practice but the OAuth spec does not guarantee it.
 *   - A leading '@' on the env value is stripped, so both
 *     AUTH_ALLOWED_EMAIL_DOMAIN=example.com and =@example.com work (matches
 *     the ALLOWED_ADMIN_EMAIL_DOMAIN=@domain convention used elsewhere).
 */
export function isEmailAllowed(
  email: string | null | undefined,
  domainEnv: string | undefined,
): boolean {
  const domain = domainEnv?.trim().replace(/^@/, '').toLowerCase()
  if (!domain) return true
  if (!email) return false
  return email.toLowerCase().endsWith(`@${domain}`)
}

// ── NextAuth v5 initialization ──────────────────────────────────────────────

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  // JWT session strategy: no Session table written to DB.
  // All session state lives in a signed/encrypted HttpOnly cookie.
  //
  // maxAge: 1 hour (NOT the NextAuth default of 30 days). The role claim in
  // the JWT is only re-fetched from DB on initial sign-in and on
  // trigger === 'update' (explicit useSession().update() call). A short TTL
  // bounds the staleness window: an admin whose role is revoked keeps
  // admin-level claims for at most 1 hour unless they re-login or the client
  // calls session.update(). For immediate revocation, also delete the user's
  // session cookie or rotate NEXTAUTH_SECRET.
  session: { strategy: 'jwt', maxAge: 3600 },

  providers: [
    // Google OAuth — only configured when AUTH_GOOGLE_ID is set.
    // NextAuth v5 auto-reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET.
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? '',
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? '',
    }),

    // Credentials provider — email + password via bcrypt against Prisma.
    // Note: direct Prisma lookup is intentional here. NextAuth calls
    // authorize() in its own route handler context (before the tsyringe
    // container bootstrap), so we use prisma directly rather than injecting
    // AuthPort. The AuthPort.signInWithPassword() in NextAuthAdapter covers
    // the use-case layer path used by API routes and admin actions.
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined

        if (!email || !password) return null

        try {
          const user = await prisma.user.findUnique({ where: { email } })
          if (!user?.passwordHash) return null

          const valid = await bcrypt.compare(password, user.passwordHash)
          if (!valid) return null

          // Return the user shape expected by NextAuth jwt callback.
          return {
            id: user.id,
            email: user.email,
            name: user.name ?? undefined,
            image: user.image ?? undefined,
            // role is NOT included here — jwt callback fetches it from DB
            // to ensure the JWT always reflects the authoritative DB value.
          }
        } catch {
          return null
        }
      },
    }),
  ],

  callbacks: {
    /**
     * signIn callback — runs for BOTH Google OAuth and Credentials paths.
     * Enforces AUTH_ALLOWED_EMAIL_DOMAIN; returning false triggers
     * /api/auth/error?error=AccessDenied → pages.error → /auth/sign-in?error=AccessDenied.
     */
    async signIn({ user }) {
      return isEmailAllowed(user.email, process.env.AUTH_ALLOWED_EMAIL_DOMAIN)
    },

    /**
     * jwt callback — injects role from Prisma User into the JWT token.
     *
     * `user` is populated on initial sign-in only. On subsequent requests,
     * only `token` is available. On `trigger === 'update'` (session refresh
     * after role change), we re-fetch from DB.
     */
    async jwt({ token, user, trigger }) {
      if (user?.id) {
        // Initial sign-in: fetch role + status from DB (authoritative).
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true, status: true },
          })
          token.role = dbUser?.role ?? 'member'
          token.status = dbUser?.status ?? 'pending'
          token.userId = user.id
        } catch {
          token.role = 'member'
          token.status = 'pending'
          token.userId = user.id
        }
      }

      if (trigger === 'update' && token.userId) {
        // Re-fetch role on session update (e.g., after admin changes role).
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.userId as string },
            select: { role: true, status: true },
          })
          if (dbUser) {
            token.role = dbUser.role
            token.status = dbUser.status
          }
        } catch {
          // Keep existing token claims on DB error.
        }
      }

      return token
    },

    /**
     * session callback — exposes role and id on session.user for Server
     * Components and Route Handlers that call auth().
     */
    async session({ session, token }) {
      if (token.role) {
        session.user.role = token.role as Role
      }
      if (token.userId) {
        session.user.id = token.userId as string
      }
      return session
    },
  },

  pages: {
    // Redirect to our custom sign-in page.
    signIn: '/auth/sign-in',
    // Auth errors (AccessDenied, etc.) surface as ?error= on the sign-in page.
    error: '/auth/sign-in',
  },
})

// ── TypeScript module augmentation ─────────────────────────────────────────
// Extend next-auth's built-in types so session.user.role and JWT.role are typed.

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: Role
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

// JWT type augmentation: next-auth re-exports JWT from @auth/core/jwt.
// We augment the module that next-auth's internal code uses.
// The 'next-auth/jwt' module re-exports from '@auth/core/jwt' at runtime,
// but for module augmentation we extend the types that next-auth exposes.
declare module 'next-auth' {
  interface JWT {
    role?: string
    userId?: string
    status?: string
  }
}
