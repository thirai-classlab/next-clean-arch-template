import { describe, it, expect } from 'vitest'
import { createEmail } from './email'
import { ValidationError } from '../errors/validation-error'

describe('Email VO', () => {
  it('accepts a valid email and returns ok(Email)', () => {
    const r = createEmail('alice@example.com')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.value).toBe('alice@example.com')
      expect(r.value._brand).toBe('Email')
    }
  })

  it('lowercases the email value', () => {
    const r = createEmail('Alice@Example.COM')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.value).toBe('alice@example.com')
    }
  })

  it('returns err(ValidationError) when "@" is missing', () => {
    const r = createEmail('not-an-email')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toBeInstanceOf(ValidationError)
      expect(r.error.code).toBe('VALIDATION_ERROR')
    }
  })

  it('freezes the produced Email object (immutability)', () => {
    const r = createEmail('a@b.com')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(Object.isFrozen(r.value)).toBe(true)
    }
  })
})
