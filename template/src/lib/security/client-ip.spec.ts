// src/lib/security/client-ip.spec.ts
// task #36 Step 2.5 — client IP derivation priority order + spoofing fallback.
import { describe, it, expect } from 'vitest'
import { getClientIp, UNKNOWN_IP } from './client-ip'

function headersFrom(map: Record<string, string>) {
  return {
    get: (name: string): string | null => map[name.toLowerCase()] ?? null,
  }
}

describe('getClientIp', () => {
  it('prefers x-real-ip over x-forwarded-for', () => {
    // Arrange
    const headers = headersFrom({
      'x-real-ip': '203.0.113.7',
      'x-forwarded-for': '198.51.100.1, 10.0.0.1',
    })

    // Act
    const ip = getClientIp(headers)

    // Assert
    expect(ip).toBe('203.0.113.7')
  })

  it('uses the first x-forwarded-for entry when x-real-ip is absent', () => {
    // Arrange
    const headers = headersFrom({
      'x-forwarded-for': '198.51.100.1, 10.0.0.1, 10.0.0.2',
    })

    // Act
    const ip = getClientIp(headers)

    // Assert — first hop is the originating client, not the proxies.
    expect(ip).toBe('198.51.100.1')
  })

  it('trims whitespace from the chosen IP', () => {
    const headers = headersFrom({ 'x-forwarded-for': '  192.0.2.5 , 10.0.0.1' })
    expect(getClientIp(headers)).toBe('192.0.2.5')
  })

  it('falls back to "unknown" when no IP header is present', () => {
    expect(getClientIp(headersFrom({}))).toBe(UNKNOWN_IP)
  })

  it('falls back to "unknown" when headers are empty strings', () => {
    const headers = headersFrom({ 'x-real-ip': '', 'x-forwarded-for': '   ' })
    expect(getClientIp(headers)).toBe(UNKNOWN_IP)
  })
})
