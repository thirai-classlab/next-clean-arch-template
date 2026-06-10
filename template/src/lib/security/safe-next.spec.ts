// apps/web/src/lib/security/safe-next.spec.ts
// task #37 Step 4 (auth-login-strategy, security M-R3-4 / M-R4-1):
// isSafeNext() の CRLF / NUL 拒否 (HTTP response splitting 防止) を中心に検証する。
// scheme-relative / backslash / absolute URL の既存防御は owasp.spec.ts にも
// あるが、本 spec で behavior 全体を網羅的に回帰する。

import { describe, it, expect } from 'vitest'
import { isSafeNext } from './safe-next'

const NUL = String.fromCharCode(0)

describe('isSafeNext', () => {
  describe('accepts same-origin absolute paths', () => {
    it.each(['/', '/dashboard', '/admin/dashboard', '/a/b/c?x=1#h'])(
      'accepts %s',
      (path) => {
        expect(isSafeNext(path)).toBe(true)
      },
    )
  })

  describe('rejects non-string / empty', () => {
    it('rejects empty string', () => {
      expect(isSafeNext('')).toBe(false)
    })

    it('rejects a relative path without leading slash', () => {
      expect(isSafeNext('dashboard')).toBe(false)
    })
  })

  describe('rejects cross-origin / scheme tricks (regression)', () => {
    it.each([
      'https://evil.com/path',
      'http://evil.com',
      '//evil.com',
      '\\evil.com',
      '/\\evil.com',
      'javascript:alert(1)',
    ])('rejects %s', (value) => {
      expect(isSafeNext(value)).toBe(false)
    })
  })

  describe('rejects CRLF / NUL (HTTP response splitting, M-R3-4)', () => {
    it('rejects a path containing CRLF + injected header', () => {
      expect(isSafeNext('/dashboard\r\nSet-Cookie: session=evil')).toBe(false)
    })

    it('rejects a bare CR', () => {
      expect(isSafeNext('/dashboard\rSet-Cookie: x=y')).toBe(false)
    })

    it('rejects a bare LF', () => {
      expect(isSafeNext('/dashboard\nSet-Cookie: x=y')).toBe(false)
    })

    it('rejects an embedded NUL byte', () => {
      expect(isSafeNext(`/dashboard${NUL}evil`)).toBe(false)
    })

    it('rejects CRLF even before the leading-slash check', () => {
      // The CRLF guard must run before "starts with /" so "/\r\n.." style
      // payloads are caught regardless of condition ordering.
      expect(isSafeNext('/\r\nLocation: https://evil.com')).toBe(false)
    })
  })

  // FIX-C-2: runtime type guard — isSafeNext must return false for non-string
  // inputs rather than throwing (defense against callers passing unvalidated values).
  describe('rejects non-string runtime inputs (runtime guard)', () => {
    it('returns false for null', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(isSafeNext(null as any)).toBe(false)
    })

    it('returns false for undefined', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(isSafeNext(undefined as any)).toBe(false)
    })

    it('returns false for a number', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(isSafeNext(42 as any)).toBe(false)
    })
  })

  // FIX-C-2: data: URI must be rejected by the leading-slash check (regression).
  describe('rejects data: URI (regression)', () => {
    it('returns false for data:text/html,... (no leading slash)', () => {
      expect(isSafeNext('data:text/html,<script>alert(1)</script>')).toBe(false)
    })
  })

  // FIX-C-2: URL-encoded CRLF / NUL (defense-in-depth, task #37 Step 5).
  // Real-world response splitting risk via %0d%0a is low because modern browsers
  // do not decode percent-encoded CRLF in Location headers. We guard preemptively
  // because Next.js redirect() may normalise paths before emitting headers.
  // Guard decision: ADOPTED — cheap regex, zero false-positive risk on valid paths.
  describe('rejects URL-encoded CRLF / NUL (defense-in-depth, FIX-C-2)', () => {
    it('rejects /dashboard%0d%0aSet-Cookie: evil=1 (URL-encoded CRLF)', () => {
      expect(isSafeNext('/dashboard%0d%0aSet-Cookie: evil=1')).toBe(false)
    })

    it('rejects /dashboard%0ainjected-header (URL-encoded LF only)', () => {
      expect(isSafeNext('/dashboard%0ainjected-header')).toBe(false)
    })

    it('rejects /x%00y (URL-encoded NUL)', () => {
      expect(isSafeNext('/x%00y')).toBe(false)
    })

    it('still accepts /dashboard (no regression on valid path)', () => {
      expect(isSafeNext('/dashboard')).toBe(true)
    })

    it('still accepts /admin/dashboard?q=1 (no regression on valid path with query)', () => {
      expect(isSafeNext('/admin/dashboard?q=1')).toBe(true)
    })
  })
})
