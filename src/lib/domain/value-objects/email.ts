// src/lib/domain/value-objects/email.ts
// Email Value Object — branded type, lowercased, validated through factory.

import { ok, err, type Result } from '../../application/result'
import { ValidationError } from '../errors/validation-error'

export type Email = Readonly<{ _brand: 'Email'; value: string }>

export function createEmail(raw: string): Result<Email, ValidationError> {
  if (!raw.includes('@')) {
    return err(new ValidationError('invalid email format'))
  }
  return ok(Object.freeze({ _brand: 'Email' as const, value: raw.toLowerCase() }))
}
