// src/lib/application/ports/email.port.ts
// EmailPort — abstracts transactional email sending (Resend / SMTP).

import type { Result } from '../result'
import type { Email } from '../../domain/value-objects/email'
import type { ExternalServiceError } from '../../domain/errors'

export interface EmailPort {
  send(input: {
    to: Email
    subject: string
    bodyText: string
    bodyHtml?: string
  }): Promise<Result<{ messageId: string }, ExternalServiceError>>
}
