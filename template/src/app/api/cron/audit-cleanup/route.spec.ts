// src/app/api/cron/audit-cleanup/route.spec.ts
// task-5 Step 6 — /api/cron/audit-cleanup route handler tests.
//
// Verifies the three contracts of the cron route with a MOCKED Supabase client:
//   (a) 401 when the Vercel Cron bearer (CRON_SECRET) is missing / wrong
//   (b) 200 + deleted-count passthrough on valid auth
//   (c) error path returns the standard error envelope (api-error-response)
//
// The route uses a service-role Supabase client to rpc('cleanup_old_audit_logs').
// We mock the client factory so no real network / DB is hit (mirrors the
// vi.mock pattern used by app/api/recordings/[id]/route.spec.ts).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the service-role client factory used by the route.
const rpcMock = vi.fn()
vi.mock('./service-role-client', () => ({
  createServiceRoleClient: vi.fn(() => ({ rpc: rpcMock })),
}))

import { POST } from './route'

const CRON_SECRET = 'test-cron-secret'

function makeRequest(authHeader?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (authHeader !== undefined) headers.authorization = authHeader
  return new NextRequest('http://localhost/api/cron/audit-cleanup', {
    method: 'POST',
    headers,
  })
}

describe('POST /api/cron/audit-cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
  })

  afterEach(() => {
    delete process.env.CRON_SECRET
  })

  it('returns 401 with UNAUTHORIZED envelope when the bearer header is missing', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({
      error: { code: 'UNAUTHORIZED', message: expect.any(String) },
    })
    // Must not touch the DB when unauthorized.
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('returns 401 when the bearer token is wrong', async () => {
    const res = await POST(makeRequest('Bearer wrong-secret'))
    expect(res.status).toBe(401)
    expect((await res.json()).error.code).toBe('UNAUTHORIZED')
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('returns 401 when the Authorization scheme is not Bearer', async () => {
    const res = await POST(makeRequest(CRON_SECRET)) // no "Bearer " prefix
    expect(res.status).toBe(401)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('returns 200 and passes through the deleted count on valid auth', async () => {
    rpcMock.mockResolvedValue({ data: 42, error: null })

    const res = await POST(makeRequest(`Bearer ${CRON_SECRET}`))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, deletedCount: 42 })
    expect(rpcMock).toHaveBeenCalledWith('cleanup_old_audit_logs', {
      p_retention_days: 91,
    })
  })

  it('coerces a null rpc count to 0 (defensive passthrough)', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null })

    const res = await POST(makeRequest(`Bearer ${CRON_SECRET}`))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, deletedCount: 0 })
  })

  it('returns the standard error envelope when the rpc fails', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: 'permission denied for function cleanup_old_audit_logs' },
    })

    const res = await POST(makeRequest(`Bearer ${CRON_SECRET}`))

    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error.code).toBe('EXTERNAL_SERVICE_ERROR')
    expect(typeof body.error.message).toBe('string')
  })

  it('returns 500 INTERNAL_ERROR when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET
    const res = await POST(makeRequest('Bearer anything'))
    expect(res.status).toBe(500)
    expect((await res.json()).error.code).toBe('INTERNAL_ERROR')
    expect(rpcMock).not.toHaveBeenCalled()
  })
})
