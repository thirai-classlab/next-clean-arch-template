// src/lib/domain/errors/validation-error.ts
import { DomainError } from './domain-error'

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR'
}
