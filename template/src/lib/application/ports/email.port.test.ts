import { describe, it, expectTypeOf } from 'vitest'
import type { EmailPort } from './email.port'
import type { Result } from '../result'
import type { Email } from '../../domain/value-objects/email'
import type { ExternalServiceError } from '../../domain/errors'

describe('EmailPort (type-level)', () => {
  it('send: (input) => Promise<Result<{messageId}, ExternalServiceError>>', () => {
    expectTypeOf<EmailPort['send']>().toEqualTypeOf<
      (input: {
        to: Email
        subject: string
        bodyText: string
        bodyHtml?: string
      }) => Promise<Result<{ messageId: string }, ExternalServiceError>>
    >()
  })
})
