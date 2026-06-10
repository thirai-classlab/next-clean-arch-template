// apps/web/src/instrumentation.ts
// Next.js instrumentation hook — startup-time safeguard for `MOCK_MODE=true`
// accidentally persisted into a production env.
//
// Why this exists:
//   MOCK_MODE=true enables a cookie-based auth fallback (mock_session cookie →
//   role) intended only for local development. If it leaks into a production
//   runtime it bypasses real authentication. Throwing at register() time turns
//   a silent misconfig into a loud startup failure (fail-fast), forcing the
//   operator to remove the var before the app can boot.
//
// References:
//   - Next.js 14 `instrumentation.ts` is stable (since 14.0.4) and runs once
//     per server process before any request is handled.
//   - draft 08 §Phase 4 / Step 4.2 (NEW-N-01 — admin gate hardening)

/**
 * Next.js instrumentation hook — invoked once per server process at boot.
 *
 * Throws synchronously if `MOCK_MODE=true` is present in a `NODE_ENV=production`
 * runtime so the process refuses to start.
 *
 * Throwing during `register()` is intentional: Next.js surfaces the error
 * via the standard server startup pipeline (logged + non-zero exit), which
 * is exactly the "loud failure" we want for this class of misconfiguration.
 */
export async function register(): Promise<void> {
  // S-01: Fail-fast guard — MOCK_MODE=true in production would enable a cookie-
  // based auth fallback in auth-helper.ts (mock_session cookie → role). This
  // must never reach production. Throwing here turns a silent misconfiguration
  // into a loud startup failure.
  //
  // This guard applies to ALL deploy profiles, including vps-next-postgres:
  // env-schema refinement 4 intentionally permits the
  // DEPLOY_PROFILE=vps-next-postgres + MOCK_MODE=true combination so that
  // `next build` (build-time CI verification) succeeds without a DB — but that
  // exception is for build time only. At server startup (register() runs once
  // per server process, before any request) a production runtime with
  // MOCK_MODE=true would wire MockAuthAdapter instead of NextAuthAdapter and
  // allow any role via the mock_session cookie, so we refuse to boot.
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.MOCK_MODE === 'true'
  ) {
    throw new Error(
      '[SEC] FATAL: MOCK_MODE=true is forbidden in NODE_ENV=production ' +
        `(DEPLOY_PROFILE=${process.env.DEPLOY_PROFILE ?? 'unset'}). ` +
        'Remove MOCK_MODE from the production runtime env before starting the ' +
        'server. MOCK_MODE bypasses real authentication adapters and enables ' +
        'a cookie-based role override intended only for local development. ' +
        'The env-schema exception for vps-next-postgres + MOCK_MODE=true ' +
        'applies to build-time verification only, never to a running server.',
    )
  }
}
