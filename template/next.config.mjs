/** @type {import('next').NextConfig} */
//
// task-5 Step 7 round-3 fix (R3-A MEDIUM-N3 / R3-E R2-F6-01):
// task-5 Step 7 round-5 fix (R4-SEC-2 CRITICAL / R4-SEC-3 HIGH):
//
// Production security headers for OWASP A05 (Security Misconfiguration).
// Applied to every route via the catch-all `source: '/(.*)'` matcher.
//
// Header rationale:
//   X-Content-Type-Options: nosniff
//     Prevents MIME-sniffing — browsers must honor declared Content-Type.
//   X-Frame-Options: DENY
//     Hard clickjacking defense. App has zero legitimate iframe-embed use case.
//   Strict-Transport-Security: max-age=2 years; includeSubDomains; preload
//     HSTS preload-eligible. Forces HTTPS for 2 years across all subdomains.
//   Referrer-Policy: strict-origin-when-cross-origin
//     Sends full URL same-origin, only origin cross-origin, nothing for HTTP downgrade.
//   Permissions-Policy: camera=(), microphone=(), geolocation=()
//     Recall.ai POC has no need for these device APIs from this Next.js app
//     (media capture happens in the Recall bot / Desktop SDK, not the web UI).
//   Content-Security-Policy:
//     Locked-down default-src 'self'. `'unsafe-inline'` on style-src is required
//     by Chakra UI v3's runtime style injection (emotion). Next.js inline
//     bootstrap scripts use a nonce in production; without per-request nonce
//     wiring we accept `'unsafe-inline'` on script-src for the POC and document
//     the gap. `'unsafe-eval'` is restricted to development only — Next.js dev
//     server / Fast Refresh / Webpack HMR require runtime eval for module
//     replacement, but production bundles never call eval() so we drop the
//     directive to close a known XSS gadget (R4-SEC-3 HIGH — 3 reviewers).
//     connect-src includes ws:/wss: for the socket.io transport.
//
// References:
//   - draft 08 §Phase 6 (R2-F6 security finalization)
//   - Next.js 14 docs: https://nextjs.org/docs/app/api-reference/next-config-js/headers
//   - Next.js 14.x instrumentation: https://nextjs.org/docs/14/app/api-reference/file-conventions/instrumentation
//   - OWASP Secure Headers Project (header set baseline)
//   - MDN CSP `script-src` 'unsafe-eval': https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src#unsafe-eval

// R4-SEC-3 HIGH: gate `'unsafe-eval'` behind dev-only so production bundles
// do not advertise an eval() gadget. Next.js production bundles are
// pre-compiled and never call eval(); only the dev server's HMR runtime does.
const isProd = process.env.NODE_ENV === 'production'

const scriptSrc = isProd
  ? "script-src 'self' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval'"

const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js dev/prod bootstrap scripts. Per-request nonce wiring is a
      // future hardening step (tracked in draft 08 §Phase 6 future-work).
      // 'unsafe-eval' is dev-only (HMR) — stripped in production builds.
      scriptSrc,
      // Chakra UI v3 + emotion inject runtime styles via <style> tags.
      // Google Fonts CSS is loaded from fonts.googleapis.com (stylesheet).
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      // Google Fonts font files are served from fonts.gstatic.com.
      "font-src 'self' data: https://fonts.gstatic.com",
      // socket.io requires ws:/wss:. Supabase requires https://*.supabase.co.
      "connect-src 'self' ws: wss: https://*.supabase.co",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig = {
  reactStrictMode: true,
  // Recall.ai POC は SPA 寄り (Zustand store + WebSocket) なので
  // 画像最適化 / 国際化等は明示的に必要になるまで設定しない。
  experimental: {
    // R4-SEC-2 CRITICAL: enable `instrumentation.ts` `register()` hook.
    // In Next.js 14.x the instrumentation file is gated behind this opt-in
    // flag (removed in v15 where it became stable). Without this flag the
    // SEC-H5 fail-fast safeguard in `src/instrumentation.ts` is silent dead
    // code — production boot would never invoke `register()`.
    // Ref: https://nextjs.org/docs/14/app/api-reference/file-conventions/instrumentation
    instrumentationHook: true,
    // Chakra UI v3 bundle optimization — tree-shake unused Chakra modules.
    // Ref: https://chakra-ui.com/docs/get-started/frameworks/next-app
    optimizePackageImports: ['@chakra-ui/react'],
  },
  async headers() {
    return [
      {
        // Apply to all routes including pages, API, static — defense in depth.
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
