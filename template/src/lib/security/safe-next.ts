// apps/web/src/lib/security/safe-next.ts
// task-5 Step 7 round-3 fix (R3-A SEC-A7-2 CRITICAL / HIGH-N1):
// task-5 Step 7 round-5 fix (R4-SEC-4 MEDIUM): moved from auth/callback/safe-next.ts
//   to apps/web/src/lib/security/ for shared access across future redirect paths.
//
// OAuth callback の `?next=<path>` を `${origin}${next}` に concat する前に
// **同一 origin 内 path であることを検証** する helper。
//
// 防御対象:
//  - scheme-relative URL: `//evil.com`           → browser が `https://evil.com` 扱い
//  - absolute URL:        `https://attacker.com` → 外部 redirect
//  - backslash trick:     `\evil.com` / `/\evil.com` → 一部 browser が `//` 扱い
//  - protocol scheme:     `javascript:alert(1)` → XSS (location header だと無効化されるが defense-in-depth)
//  - 空文字 / 相対 path:  `dashboard`           → scheme parse される可能性
//  - CRLF / NUL injection: `/dashboard\r\nSet-Cookie:...` → HTTP response
//                          splitting (header 注入)。location header に concat
//                          される前に拒否する (task #37 Step 4, security M-R3-4)。
//
// 通過条件 (AND):
//  1. 文字列が空でない
//  2. CR(\r) / LF(\n) / NUL(\0) を含まない (response splitting reject)
//  3. `/` で始まる (= same-origin absolute path)
//  4. `//` で始まらない (scheme-relative reject)
//  5. `\` または `/\` で始まらない (backslash quirk reject)

export function isSafeNext(rawNext: string): boolean {
  if (typeof rawNext !== 'string' || rawNext.length === 0) {
    return false
  }
  // Reject CR / LF / NUL — otherwise `/dashboard\r\nSet-Cookie: x=y` could split
  // the HTTP response (header injection) when concatenated into a Location header.
  if (/[\r\n\0]/.test(rawNext)) {
    return false
  }
  // Defense-in-depth: also reject URL-encoded CRLF (%0d / %0a) and NUL (%00).
  // Modern browsers do not decode percent-encoded CRLF in Location headers, so
  // real-world response splitting risk is low. However, Next.js redirect() may
  // normalise the path internally before emitting headers, so we reject these
  // cheap patterns preemptively (task #37 Step 5, FIX-C-2).
  if (/%0[da]|%00/i.test(rawNext)) {
    return false
  }
  // Reject scheme-relative URLs ("//host") — must be checked BEFORE the
  // "starts with /" check because "//foo" also matches "starts with /".
  if (rawNext.startsWith('//')) {
    return false
  }
  // Reject backslash tricks: "\evil" or "/\evil"
  if (rawNext.startsWith('\\') || rawNext.startsWith('/\\')) {
    return false
  }
  // Require leading slash (same-origin absolute path)
  if (!rawNext.startsWith('/')) {
    return false
  }
  return true
}
