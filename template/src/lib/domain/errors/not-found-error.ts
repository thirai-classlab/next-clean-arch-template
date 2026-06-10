// src/lib/domain/errors/not-found-error.ts
import { DomainError } from './domain-error'

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND'

  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`)
  }
}
