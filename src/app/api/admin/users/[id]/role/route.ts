// src/app/api/admin/users/[id]/role/route.ts
// task-5 Step 5 — representative admin REST endpoint (draft 08 §7.2 / §7.10).
// PATCH /api/admin/users/:id/role — admin-only role change.
//
// Demonstrates the shared layers end-to-end:
//   - requireRole(['admin'])              (server-side role gate, draft 08 §4.3)
//   - zod validation                      (VALIDATION_ERROR envelope)
//   - apiError / apiErrorFromDomain       (consistent error envelope, _lib)
//   - changeUserRole (audited action)     (mutation + audit_log entry)
//
// Next.js 14 route handler: the dynamic segment `params` is a Promise in this
// repo's existing handlers (see app/api/recordings/[id]/route.ts), so we await it.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth/role-guard'
import { changeUserRole } from '@/app/(admin)/admin/_lib/admin-actions'
import {
  apiError,
  buildApiError,
} from '@/app/(admin)/admin/_lib/api-error-response'

const PatchRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  // 1. Server-side role gate.
  const auth = await requireRole(['admin'])
  if (auth.kind === 'unauthorized') return apiError('UNAUTHORIZED')
  if (auth.kind === 'forbidden') return apiError('FORBIDDEN')

  // 2. Validate body.
  const body = await req.json().catch(() => null)
  const parsed = PatchRoleSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', undefined, parsed.error.flatten())
  }

  // 3. Mutate (audited Server Action records audit_log on success).
  const { id } = await params
  const result = await changeUserRole(id, parsed.data.role)
  if ('error' in result) {
    // The action returns a string error; surface as 502 (upstream/use-case).
    return NextResponse.json(
      buildApiError('EXTERNAL_SERVICE_ERROR', result.error),
      { status: 502 },
    )
  }

  return NextResponse.json({ success: true }, { status: 200 })
}

export const runtime = 'nodejs'
