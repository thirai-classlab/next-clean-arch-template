import { describe, it, expect } from 'vitest'
import { ok, err, isOk, type Result } from './result'
import { ValidationError } from '../domain/errors/validation-error'

describe('Result', () => {
  describe('ok()', () => {
    it('returns a success Result with the provided value', () => {
      const r = ok(42)
      expect(r.ok).toBe(true)
      if (r.ok) {
        expect(r.value).toBe(42)
      }
    })

    it('works with object values', () => {
      const r = ok({ id: 'u1', email: 'a@b.com' })
      expect(r.ok).toBe(true)
      if (r.ok) {
        expect(r.value).toEqual({ id: 'u1', email: 'a@b.com' })
      }
    })
  })

  describe('err()', () => {
    it('returns a failure Result with the provided error', () => {
      const e = new ValidationError('bad input')
      const r = err(e)
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(r.error).toBe(e)
      }
    })
  })

  describe('isOk()', () => {
    it('narrows a success Result', () => {
      const r: Result<number, ValidationError> = ok(7)
      expect(isOk(r)).toBe(true)
      if (isOk(r)) {
        // type-narrowing: r.value should be number
        const v: number = r.value
        expect(v).toBe(7)
      }
    })

    it('narrows a failure Result', () => {
      const r: Result<number, ValidationError> = err(new ValidationError('x'))
      expect(isOk(r)).toBe(false)
    })
  })

  it('Result is a discriminated union on `ok`', () => {
    const make = (n: number): Result<number, ValidationError> =>
      n >= 0 ? ok(n) : err(new ValidationError('negative'))

    const good = make(3)
    const bad = make(-1)

    expect(good.ok).toBe(true)
    expect(bad.ok).toBe(false)
    if (!bad.ok) {
      expect(bad.error).toBeInstanceOf(ValidationError)
    }
  })
})
