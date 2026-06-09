// src/lib/application/repositories/bot.repository.spec.ts
// Type-level test for BotRepository interface shape (draft 06 §1.4 L473-479).

import { describe, it, expectTypeOf } from 'vitest'
import type { BotRepository } from './bot.repository'
import type { Bot } from '@/lib/domain/entities'
import type { BotStatus } from '@/lib/domain/value-objects/bot-status'
import type { Result } from '../result'
import type {
  NotFoundError,
  ExternalServiceError,
} from '@/lib/domain/errors'

describe('BotRepository (interface shape)', () => {
  it('exposes findById(id) -> Promise<Result<Bot, NotFoundError>>', () => {
    expectTypeOf<BotRepository['findById']>().toEqualTypeOf<
      (id: string) => Promise<Result<Bot, NotFoundError>>
    >()
  })

  it('exposes findByStatus(status) -> Promise<ReadonlyArray<Bot>>', () => {
    expectTypeOf<BotRepository['findByStatus']>().toEqualTypeOf<
      (status: BotStatus) => Promise<ReadonlyArray<Bot>>
    >()
  })

  it('exposes save(bot) -> Promise<Result<Bot, ExternalServiceError>>', () => {
    expectTypeOf<BotRepository['save']>().toEqualTypeOf<
      (bot: Bot) => Promise<Result<Bot, ExternalServiceError>>
    >()
  })

  it('exposes delete(id) -> Promise<Result<void, NotFoundError>>', () => {
    expectTypeOf<BotRepository['delete']>().toEqualTypeOf<
      (id: string) => Promise<Result<void, NotFoundError>>
    >()
  })
})
