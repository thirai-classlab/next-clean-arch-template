// src/lib/domain/errors/domain-error.ts
// Abstract base for all domain-layer errors. Concrete subclasses set `code`.

export abstract class DomainError extends Error {
  abstract readonly code: string

  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}
