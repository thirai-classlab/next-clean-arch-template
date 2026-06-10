// src/lib/application/result.ts
// Discriminated-union Result for all UseCases. Domain errors are surfaced via `err()`
// instead of `throw`, keeping the Domain layer pure (no exceptions for invariants).

import type { DomainError } from '../domain/errors/domain-error'

export type Result<T, E extends DomainError = DomainError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value })

export const err = <E extends DomainError>(error: E): Result<never, E> => ({
  ok: false,
  error,
})

export const isOk = <T, E extends DomainError>(
  result: Result<T, E>,
): result is { readonly ok: true; readonly value: T } => result.ok
