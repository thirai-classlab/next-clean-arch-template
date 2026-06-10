// src/lib/supabase/middleware-vps-nest.ts
// VPS Nest middleware session helper — Edge-safe Nest JWT HS256 role reader.
//
// Used by src/middleware.ts when DEPLOY_PROFILE=vps-nest-postgres or
// DEPLOY_PROFILE=vps-nest-mariadb.
//
// Design constraints:
//   - MUST NOT import Prisma Client (not Edge-compatible).
//   - MUST NOT import next-auth (NextAuth JWE decryption unrelated here).
//   - Uses jwtVerify() from 'jose' which operates over the Web Crypto API
//     (Edge-safe, no Node.js crypto module required).
//   - Returns the role string from the JWT payload, or null if absent.
//
// JWT details (matches Nest api/src/auth/auth.service.ts):
//   algorithm : HS256
//   cookie    : 'nest-session-token' (httpOnly, sameSite=lax)
//   payload   : { sub, email, role }
//   secret    : JWT_SECRET env var (shared between Nest and this middleware)
//
// MOCK_MODE fallback:
//   When NODE_ENV !== 'production' (i.e. local dev / CI) and JWT_SECRET is absent
//   or the cookie is missing, fall back to the 'mock_session' cookie (same pattern
//   as the Supabase and NextAuth paths in middleware.ts). This allows MOCK_MODE=true
//   CI builds to pass without a running Nest server.

import { jwtVerify } from 'jose'
import type { NextRequest } from 'next/server'

const NEST_SESSION_COOKIE = 'nest-session-token'

/**
 * Read the Nest HS256 JWT from the 'nest-session-token' cookie and return the
 * user's role string.
 *
 * Returns null when:
 *   - No 'nest-session-token' cookie is present (unauthenticated)
 *   - JWT_SECRET is not set (misconfiguration)
 *   - JWT verification fails (tampered, expired, or wrong secret)
 *   - The payload does not contain a 'role' claim
 *
 * This function is safe to call in Next.js Edge Middleware (uses Web Crypto
 * via jose, no Prisma, no Node.js-only modules).
 */
export async function getNextNestSessionRole(
  request: NextRequest,
): Promise<string | null> {
  const secret = process.env.JWT_SECRET
  if (!secret) return null

  const token = request.cookies.get(NEST_SESSION_COOKIE)?.value
  if (!token) return null

  try {
    const secretBytes = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(token, secretBytes, {
      algorithms: ['HS256'],
    })
    const role = payload['role']
    if (typeof role !== 'string' || !role) return null
    return role
  } catch {
    // Verification failure (expired, invalid signature, malformed) — treat as
    // unauthenticated. Never throw from middleware to avoid 500s on bad cookies.
    return null
  }
}
