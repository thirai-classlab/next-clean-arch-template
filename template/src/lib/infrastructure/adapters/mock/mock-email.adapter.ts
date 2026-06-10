// src/lib/infrastructure/adapters/mock/mock-email.adapter.ts
// In-memory email outbox.

import { injectable } from 'tsyringe'
import type { EmailPort } from '../../../application/ports/email.port'
import { ok, err, type Result } from '../../../application/result'
import { ExternalServiceError } from '../../../domain/errors'
import type { Email } from '../../../domain/value-objects/email'

interface SentMessage {
  readonly to: Email
  readonly subject: string
  readonly bodyText: string
  readonly bodyHtml?: string
  readonly messageId: string
}

@injectable()
export class MockEmailAdapter implements EmailPort {
  readonly sent: SentMessage[] = []
  private forceFail = false
  private counter = 0

  setForceFail(v: boolean): void {
    this.forceFail = v
  }

  async send(input: {
    to: Email
    subject: string
    bodyText: string
    bodyHtml?: string
  }): Promise<Result<{ messageId: string }, ExternalServiceError>> {
    if (this.forceFail) {
      return err(new ExternalServiceError('mock-email', new Error('forced')))
    }
    const messageId = `mock-msg-${++this.counter}`
    this.sent.push({ ...input, messageId })
    return ok({ messageId })
  }
}
