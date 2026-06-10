// src/lib/domain/errors/conflict-error.ts
import { DomainError } from './domain-error'

export class ConflictError extends DomainError {
  readonly code = 'CONFLICT'
}
