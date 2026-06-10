// src/lib/domain/errors/authorization-error.ts
import { DomainError } from './domain-error'

export class AuthorizationError extends DomainError {
  readonly code = 'AUTHORIZATION_ERROR'
}
