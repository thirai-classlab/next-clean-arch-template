// src/app/api/cron/audit-cleanup/route.ts
// task-5 Step 6 (draft 08 §Phase 6 / task file Step 6) — daily audit_log retention cron.
//
// Triggered by Vercel Cron (`0 18 * * *` UTC = 03:00 JST, see root vercel.ts).
// Vercel sends `Authorization: Bearer ${CRON_SECRET}` to scheduled invocations.
//
// Flow:
//   1. Verify the Vercel Cron bearer (CRON_SECRET) with a timing-safe comparison;
//      reject missing/wrong auth with 401 (api-error-response envelope).
//   2. rpc('cleanup_old_audit_logs', { p_retention_days: 91 }) via the service-role
//      client (the function is service_role-only by C-03; DELETE is destructive).
//   3. Return the deleted count as JSON; errors use the standard error envelope.
//
// Next.js 14 route handler. Node.js runtime is required (uses node:crypto + the
// service-role key, which must never run in the Edge/browser context).

import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { apiError, buildApiError } from '@/app/(admin)/admin/_lib/api-error-response'
import { createServiceRoleClient } from './service-role-client'

/** 90 日 retention: 91 日以上前の row を削除する (task file Step 6 / draft 08 §Phase 6)。 */
const RETENTION_DAYS = 91

/**
 * Constant-time bearer comparison to avoid leaking the secret via timing
 * (Vercel reference pattern: vc_cron_dispatch). Returns false for any
 * length mismatch or non-string input.
 */
function safeBearerEqual(authHeader: string | null, secret: string): boolean {
  if (typeof authHeader !== 'string') return false
  const expected = `Bearer ${secret}`
  const a = Buffer.from(authHeader)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth: the secret must be configured server-side, and the bearer must match.
  const secret = process.env.CRON_SECRET
  if (!secret) {
    // Misconfiguration (deploy without CRON_SECRET) — fail closed, do not run.
    return apiError('INTERNAL_ERROR', 'CRON_SECRET is not configured.')
  }
  if (!safeBearerEqual(req.headers.get('authorization'), secret)) {
    return apiError('UNAUTHORIZED')
  }

  // 2. Run the cleanup via the service-role client (RLS-bypassing rpc).
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase.rpc('cleanup_old_audit_logs', {
      p_retention_days: RETENTION_DAYS,
    })

    if (error) {
      return NextResponse.json(
        buildApiError('EXTERNAL_SERVICE_ERROR', error.message),
        { status: 502 },
      )
    }

    // 3. Pass through the deleted count for monitoring (coerce null -> 0).
    const deletedCount = typeof data === 'number' ? data : Number(data ?? 0)
    return NextResponse.json({ success: true, deletedCount }, { status: 200 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unexpected error'
    return NextResponse.json(buildApiError('INTERNAL_ERROR', message), {
      status: 500,
    })
  }
}

export const runtime = 'nodejs'
