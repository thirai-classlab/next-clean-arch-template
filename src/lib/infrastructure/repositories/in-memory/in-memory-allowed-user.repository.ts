// src/lib/infrastructure/repositories/in-memory/in-memory-allowed-user.repository.ts
// In-memory AllowedUserRepository — draft 06 §3 minimal Profile persistence.
// Conflict semantics: `save` returns ConflictError when a *different* row already
// claims the same email (the allow-list's natural unique key).
//
// globalThis-backed store (task-35 Step 2d):
//   Next.js 14 App Router gives Server Actions and Server Components separate
//   Node.js module cache entries.  The tsyringe container (and thus the Singleton
//   lifecycle) is instantiated independently in each context, so a plain `new Map()`
//   field on the class instance would not be shared.
//   Using `globalThis.__allowedUserStore__` makes the Map live on the process-global
//   object, which is shared across module contexts in the same Node.js process —
//   exactly the same pattern that Prisma recommends for dev hot-reload singletons.
import 'reflect-metadata'
import { injectable } from 'tsyringe'
import type { AllowedUserRepository } from '@/lib/application/repositories'
import { ok, err, type Result } from '@/lib/application/result'
import type { AllowedUser } from '@/lib/domain/entities'
import type { Email } from '@/lib/domain/value-objects/email'
import {
  ConflictError,
  ExternalServiceError,
  NotFoundError,
} from '@/lib/domain/errors'
import { InMemoryRepositoryBase } from './in-memory-base'

/** Process-global backing store — survives Next.js module isolation. */
const GLOBAL_KEY = '__recall_poc_allowedUserStore__'
declare global {
  // eslint-disable-next-line no-var
  var __recall_poc_allowedUserStore__: Map<string, AllowedUser> | undefined
}

function getGlobalStore(): Map<string, AllowedUser> {
  // M-2 production fail-fast guard: in-memory stores are forbidden in production
  // to prevent accidental cross-tenant data exposure when this template is deployed.
  if (process.env.NODE_ENV === 'production' && process.env.MOCK_MODE !== 'true') {
    throw new Error(
      '[SEC] InMemoryAllowedUserRepository is forbidden in production. ' +
        'Set MOCK_MODE=true or replace with a persistent repository implementation.',
    )
  }
  if (!globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY] = new Map<string, AllowedUser>()
  }
  return globalThis[GLOBAL_KEY] as Map<string, AllowedUser>
}

@injectable()
export class InMemoryAllowedUserRepository
  extends InMemoryRepositoryBase<AllowedUser>
  implements AllowedUserRepository
{
  /** Override the base-class store with the process-global Map. */
  protected override readonly store: Map<string, AllowedUser> = getGlobalStore()

  /**
   * Reset the process-global store (for test isolation).
   * Call this in beforeEach when the global store must start empty.
   */
  static resetStore(): void {
    globalThis[GLOBAL_KEY] = new Map<string, AllowedUser>()
  }
  async findByEmail(email: Email): Promise<Result<AllowedUser, NotFoundError>> {
    for (const entry of this.store.values()) {
      if (entry.email.value === email.value) return ok(entry)
    }
    return err(new NotFoundError('AllowedUser', `email=${email.value}`))
  }

  async findAll(): Promise<ReadonlyArray<AllowedUser>> {
    return this.list()
  }

  async save(
    allowedUser: AllowedUser,
  ): Promise<Result<AllowedUser, ConflictError | ExternalServiceError>> {
    for (const existing of this.store.values()) {
      if (
        existing.id !== allowedUser.id &&
        existing.email.value === allowedUser.email.value
      ) {
        return err(
          new ConflictError(
            `allowed user with email ${allowedUser.email.value} already exists`,
          ),
        )
      }
    }
    return ok(this.putById(allowedUser))
  }

  async delete(id: string): Promise<Result<void, NotFoundError>> {
    return this.removeById(id)
      ? ok(undefined)
      : err(new NotFoundError('AllowedUser', id))
  }
}
