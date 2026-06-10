// src/lib/supabase/middleware-vps.ts
// VPS middleware session helper — Edge-safe NextAuth JWT role reader.
//
// Used by src/middleware.ts when DEPLOY_PROFILE=vps-next-postgres.
//
// Design constraints:
//   - MUST NOT import Prisma Client (not Edge-compatible).
//   - Uses getToken() from next-auth/jwt which only performs
//     HMAC/HKDF + JWE decryption via the Web Crypto API (Edge-safe).
//   - Returns the role string from the JWT claim, or null if absent.
//
// NextAuth v5 (Auth.js) cookie names:
//   - Production:  __Secure-authjs.session-token  (secureCookie=true)
//   - Development: authjs.session-token            (secureCookie=false)
//   - Legacy beta: next-auth.session-token / __Secure-next-auth.session-token
//     (some beta versions use 'next-auth' prefix; getToken auto-resolves via
//     secureCookie flag + default cookieName logic)
//
// The `salt` parameter is required for NextAuth v5 JWE decryption.
// Auth.js derives the encryption key using HKDF with the cookie name as salt.
// getToken() defaults salt = cookieName, so we pass cookieName explicitly.

import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'

/**
 * Read the NextAuth JWT from the session cookie and return the user's role.
 *
 * Returns null when:
 *   - No session cookie is present (unauthenticated)
 *   - NEXTAUTH_SECRET is not set (misconfiguration)
 *   - JWT decryption/verification fails (tampered or expired token)
 *   - The token does not contain a role claim
 *
 * This function is safe to call in Next.js Edge Middleware.
 */
export async function getNextAuthSessionRole(
  request: NextRequest,
): Promise<string | null> {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) return null

  try {
    // secureCookie=true  → reads '__Secure-authjs.session-token'
    // secureCookie=false → reads 'authjs.session-token'
    // getToken defaults salt to cookieName (required for NextAuth v5 JWE).
    //
    // The NEXTAUTH_URL scheme is the authoritative signal (NextAuth itself
    // derives cookie security from the request/base URL): a staging host
    // serving HTTPS with NODE_ENV=development would otherwise read the wrong
    // cookie name and silently break all auth. Fall back to NODE_ENV only
    // when NEXTAUTH_URL is absent.
    const secureCookie =
      process.env.NEXTAUTH_URL?.startsWith('https://') ??
      process.env.NODE_ENV === 'production'
    const token = await getToken({
      req: request,
      secret,
      secureCookie,
    })

    if (!token?.role) return null
    return token.role as string
  } catch {
    // Decryption failure / malformed cookie — treat as unauthenticated.
    return null
  }
}
