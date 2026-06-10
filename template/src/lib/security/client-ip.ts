// apps/web/src/lib/security/client-ip.ts
// task #36 Step 2.5 — single source of truth for deriving a client IP from
// request headers, shared by Server Actions and Route Handlers.
//
// ## Priority order (draft §Step 2.5)
//   1. `x-real-ip`              — Vercel / reverse proxies set this to the single
//                                 client IP, so it is more reliable than parsing
//                                 the `x-forwarded-for` chain.
//   2. `x-forwarded-for` first  — comma-separated client→proxy chain; the first
//                                 hop is the originating client.
//   3. fallback `'unknown'`     — when no IP header is present.
//
// ## SECURITY: IP spoofing (draft §4 risk row)
//   `x-forwarded-for` (and `x-real-ip`) are client-settable headers. They are
//   only trustworthy behind a **trusted proxy** (e.g. Vercel) that overwrites
//   them with the real edge IP. On a VPS / non-Vercel deploy, the reverse proxy
//   MUST be configured with a trusted-hop count that appends the real client IP;
//   without it an attacker can spoof `x-forwarded-for` and bypass rate-limiting.
//
// ## `'unknown'` aggregation (draft §4 risk row)
//   When the IP cannot be determined, every such request collapses onto the
//   single key `'unknown'`. This means unrelated clients share one rate-limit
//   window, so one client's failures consume the budget of every other
//   `'unknown'` client (a mild DoS surface). Configure a trusted proxy that
//   injects the real IP to minimize `'unknown'` aggregation.

/** Sentinel key used when no client IP header is available. */
export const UNKNOWN_IP = 'unknown'

/**
 * Minimal header accessor shared by `Request.headers` (Route Handlers) and the
 * `next/headers` `headers()` ReadonlyHeaders (Server Actions): both expose a
 * `get(name): string | null`.
 */
export interface HeaderGetter {
  get(name: string): string | null
}

/**
 * Derive the client IP from request headers.
 *
 * @param headers - a `Headers`-like object exposing `get(name)`.
 * @returns the client IP, or {@link UNKNOWN_IP} when no IP header is present.
 */
export function getClientIp(headers: HeaderGetter): string {
  const realIp = headers.get('x-real-ip')?.trim()
  if (realIp) {
    return realIp
  }

  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    // The first entry is the originating client; later entries are proxies.
    const first = forwardedFor.split(',')[0]?.trim()
    if (first) {
      return first
    }
  }

  return UNKNOWN_IP
}
