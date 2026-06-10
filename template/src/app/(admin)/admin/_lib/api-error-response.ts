// src/app/(admin)/admin/_lib/api-error-response.ts
// task-5 Step 5 (draft 08 §REFACTOR / Phase 7) — consistent API error envelope.
//
// 30 REST endpoint の error mapping を 1 箇所に集約する (draft 08 §3 REFACTOR
// 「30 API endpoint の error mapping を `_lib/api-error-response.ts` で共通化」)。
// 既存の `app/api/_shared/error-mapping.ts` (DomainError.code -> HTTP status) を
// 再利用しつつ、その上に統一 envelope を被せる。Route Handler は薄いままに保つ。

import { NextResponse } from 'next/server'
import type { DomainError } from '@/lib/domain/errors'
import { mapErrorToStatus } from '@/app/api/_shared/error-mapping'

/**
 * Consistent error body for all admin API endpoints.
 * `code` is a stable, machine-readable identifier; `message` is human-facing.
 * `details` carries optional structured context (e.g. zod field errors).
 */
export interface ApiErrorBody {
  readonly error: {
    readonly code: string
    readonly message: string
    readonly details?: unknown
  }
}

/** Stable error codes returned by admin endpoints (RoleCheckResult mirror + generic). */
export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'INTERNAL_ERROR'

/**
 * Build the JSON error envelope (pure — no NextResponse) so it is unit-testable
 * without the Next.js runtime.
 */
export function buildApiError(
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): ApiErrorBody {
  // Omit `details` entirely when undefined so the envelope stays minimal.
  return details === undefined
    ? { error: { code, message } }
    : { error: { code, message, details } }
}

/** Default human-facing message per code (overridable by caller). */
const DEFAULT_MESSAGE: Record<ApiErrorCode, string> = {
  UNAUTHORIZED: 'Authentication required.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  VALIDATION_ERROR: 'The request payload is invalid.',
  NOT_FOUND: 'The requested resource was not found.',
  CONFLICT: 'The request conflicts with the current state.',
  EXTERNAL_SERVICE_ERROR: 'An upstream service failed.',
  INTERNAL_ERROR: 'An unexpected error occurred.',
}

/** HTTP status per code. */
const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  EXTERNAL_SERVICE_ERROR: 502,
  INTERNAL_ERROR: 500,
}

/** Resolve the HTTP status for a stable error code (pure). */
export function statusForCode(code: ApiErrorCode): number {
  return STATUS_BY_CODE[code]
}

/**
 * Build a `NextResponse` carrying the standard error envelope.
 * Used directly by Route Handlers for 401 / 403 / 400 short-circuits.
 */
export function apiError(
  code: ApiErrorCode,
  message?: string,
  details?: unknown,
): NextResponse<ApiErrorBody> {
  const body = buildApiError(code, message ?? DEFAULT_MESSAGE[code], details)
  return NextResponse.json(body, { status: STATUS_BY_CODE[code] })
}

/**
 * Map a DomainError (from a UseCase `Result.err`) to the standard envelope,
 * reusing the existing `mapErrorToStatus` status table so the two layers
 * never drift apart.
 */
export function apiErrorFromDomain(
  error: DomainError,
): NextResponse<ApiErrorBody> {
  const status = mapErrorToStatus(error)
  const code = CODE_BY_STATUS[status] ?? 'INTERNAL_ERROR'
  return NextResponse.json(buildApiError(code, error.message), { status })
}

/** Reverse map (HTTP status -> stable code) for DomainError translation. */
const CODE_BY_STATUS: Record<number, ApiErrorCode> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  502: 'EXTERNAL_SERVICE_ERROR',
  500: 'INTERNAL_ERROR',
}

/** Exposed for unit tests (status -> code lookup). */
export function codeForStatus(status: number): ApiErrorCode {
  return CODE_BY_STATUS[status] ?? 'INTERNAL_ERROR'
}
