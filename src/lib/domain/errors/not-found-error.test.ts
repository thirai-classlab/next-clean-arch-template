import { describe, it, expect } from 'vitest'
import { NotFoundError } from './not-found-error'
import { DomainError } from './domain-error'

describe('NotFoundError', () => {
  it('extends DomainError', () => {
    const e = new NotFoundError('User', 'abc-123')
    expect(e).toBeInstanceOf(DomainError)
    expect(e).toBeInstanceOf(NotFoundError)
  })

  it('has code = "NOT_FOUND"', () => {
    const e = new NotFoundError('User', 'abc-123')
    expect(e.code).toBe('NOT_FOUND')
  })

  it('has name = "NotFoundError"', () => {
    const e = new NotFoundError('User', 'abc-123')
    expect(e.name).toBe('NotFoundError')
  })

  it('builds the message from resource and id', () => {
    const e = new NotFoundError('Bot', 'bot-42')
    expect(e.message).toBe('Bot with id bot-42 not found')
  })
})
