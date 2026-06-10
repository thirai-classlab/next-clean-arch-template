// src/lib/infrastructure/adapters/real/nextauth-auth.adapter.ts
// NextAuthAdapter — AuthPort implementation for vps-next-postgres profile.
//
// Bridges the AuthPort contract to NextAuth v5 (Auth.js beta) + Prisma.
//
// Method responsibilities:
//   - signInWithPassword: credential check (Prisma + bcrypt).
//     JWT issuance is performed by signInWithPasswordVpsAction via
//     NextAuth signIn('credentials'). This method provides the same
//     credential validation for API routes that call AuthPort directly
//     (e.g., role-guard.ts, non-HTTP use-cases).
//   - signInWithGoogle: returns the NextAuth OAuth redirect URL.
//     The UI-side action (signInWithGoogleVpsAction) calls NextAuth signIn('google').
//   - getSession: reads the NextAuth JWT via auth() from src/auth.ts.
//   - signOut: calls NextAuth signOut from src/auth.ts.
//   - verifyToken: decodes NEXTAUTH_SECRET JWT using next-auth/jwt getToken
//     for API route Bearer token verification.
//
// Registered as 'NextAuthAdapter' in ADAPTER_MODULE_MAP (container.ts).
// Wired as AuthPort for DEPLOY_PROFILE=vps-next-postgres in mapping.ts.

import 'reflect-metadata'
import { injectable } from 'tsyringe'
import bcrypt from 'bcryptjs'
import type { AuthPort } from '../../../application/ports/auth.port'
import { ok, err, type Result } from '../../../application/result'
import {
  AuthorizationError,
  ExternalServiceError,
} from '../../../domain/errors'
import { toRole, type Role } from '../../../domain/value-objects/role'
import { prisma } from '../../prisma'

const SERVICE = 'nextauth-auth'

@injectable()
export class NextAuthAdapter implements AuthPort {
  /**
   * Verify email/password credentials against Prisma + bcryptjs.
   *
   * This method validates credentials for API-layer callers (e.g. role-guard,
   * admin use-cases). The primary sign-in flow (from the UI) is handled by
   * signInWithPasswordVpsAction → NextAuth signIn('credentials') → authorize()
   * in src/auth.ts. Both paths use bcrypt + Prisma; the duplication is
   * intentional because the NextAuth route handler context is separate from
   * the tsyringe DI container context.
   */
  async signInWithPassword(
    email: string,
    password: string,
  ): Promise<
    Result<{ userId: string; role: Role }, AuthorizationError | ExternalServiceError>
  > {
    try {
      const user = await prisma.user.findUnique({ where: { email } })
      if (!user?.passwordHash) {
        return err(new AuthorizationError('invalid credentials'))
      }

      const valid = await bcrypt.compare(password, user.passwordHash)
      if (!valid) {
        return err(new AuthorizationError('invalid credentials'))
      }

      const role = toRole(user.role)
      if (!role) {
        return err(new AuthorizationError('no role assigned for user'))
      }

      return ok({ userId: user.id, role })
    } catch (cause) {
      return err(new ExternalServiceError(SERVICE, cause))
    }
  }

  /**
   * Begin Google OAuth flow.
   *
   * Returns the NextAuth OAuth initiation URL. For the vps-next-postgres
   * profile, the UI-side action (signInWithGoogleVpsAction) calls NextAuth
   * signIn('google') directly — so this method is a fallback reference URL
   * for callers that use the AuthPort interface.
   */
  async signInWithGoogle(): Promise<
    Result<{ redirectUrl: string }, ExternalServiceError>
  > {
    // The actual OAuth flow is initiated by signInWithGoogleVpsAction via
    // NextAuth signIn('google') on the server action layer. This method
    // provides the standard NextAuth OAuth initiation URL for callers that
    // need it via the AuthPort interface.
    return ok({ redirectUrl: '/api/auth/signin/google' })
  }

  /**
   * Sign out the current user via NextAuth.
   *
   * Calls NextAuth signOut({ redirect: false }) to invalidate the JWT session
   * cookie without redirecting (redirect is handled by the caller route).
   */
  async signOut(_userId: string): Promise<Result<void, ExternalServiceError>> {
    try {
      const { signOut } = await import('@/auth')
      await signOut({ redirect: false })
      return ok(undefined as void)
    } catch (cause) {
      return err(new ExternalServiceError(SERVICE, cause))
    }
  }

  /**
   * Return the current session payload from the NextAuth JWT.
   *
   * Calls auth() from src/auth.ts which reads the JWT session cookie,
   * decrypts it, and returns the typed session object with role and userId.
   *
   * Note: auth() is not Edge-compatible in this usage because it re-reads
   * the Prisma-backed session if configured; for Edge use, use
   * getNextAuthSessionRole() from middleware-vps.ts instead.
   */
  async getSession(): Promise<
    Result<{ userId: string; role: Role } | null, ExternalServiceError>
  > {
    try {
      const { auth } = await import('@/auth')
      const session = await auth()
      if (!session?.user?.id || !session.user.role) return ok(null)
      const role = toRole(session.user.role)
      if (!role) return ok(null)
      return ok({ userId: session.user.id, role })
    } catch (cause) {
      return err(new ExternalServiceError(SERVICE, cause))
    }
  }

  /**
   * Verify a NextAuth JWT token string and return userId + role.
   *
   * Uses next-auth/jwt getToken() to verify and decrypt the NEXTAUTH_SECRET JWE.
   * Accepts the raw token string by constructing a minimal request object with
   * an Authorization header (getToken supports Authorization: Bearer <token>).
   *
   * Note: NextAuth v5 uses JWE (A256CBC-HS512 encrypted tokens), not plain HS256.
   * The getToken() function from next-auth/jwt handles both encryption and signing.
   */
  async verifyToken(
    token: string,
  ): Promise<Result<{ userId: string; role: Role }, AuthorizationError>> {
    try {
      const secret = process.env.NEXTAUTH_SECRET
      if (!secret) {
        return err(new AuthorizationError('NEXTAUTH_SECRET not configured'))
      }

      const { getToken } = await import('next-auth/jwt')

      // getToken can read from Authorization: Bearer header as well as cookies.
      // Pass a minimal Request-compatible object with an Authorization header
      // to verify a raw token string.
      const fakeReq = {
        headers: new Headers({ authorization: `Bearer ${token}` }),
      }

      const decoded = await getToken({
        req: fakeReq as Parameters<typeof getToken>[0]['req'],
        secret,
      })

      if (!decoded) {
        return err(new AuthorizationError('invalid or expired token'))
      }

      const userId = decoded.userId as string | undefined
      const role = toRole(decoded.role)

      if (!userId || !role) {
        return err(new AuthorizationError('missing claims in token'))
      }

      return ok({ userId, role })
    } catch {
      return err(new AuthorizationError('invalid token'))
    }
  }
}
