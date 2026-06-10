// src/lib/infrastructure/repositories/in-memory/in-memory-user.repository.ts
// In-memory UserRepository — draft 06 §3 minimal Profile persistence.
// Conflict semantics: `save` returns ConflictError when a *different* user id
// already owns the same email (email is the natural unique key for User).
//
// globalThis-backed store (task-35 Step 2d):
//   Next.js 14 App Router gives Server Actions and Server Components separate
//   Node.js module cache entries.  Using `globalThis.__recall_poc_userStore__`
//   makes the Map live on the process-global object, shared across module
//   contexts in the same Node.js process (Prisma dev singleton pattern).
import 'reflect-metadata'
import { injectable } from 'tsyringe'
import type { UserRepository } from '@/lib/application/repositories'
import { ok, err, type Result } from '@/lib/application/result'
import type { User } from '@/lib/domain/entities'
import type { Email } from '@/lib/domain/value-objects/email'
import {
  ConflictError,
  ExternalServiceError,
  NotFoundError,
} from '@/lib/domain/errors'
import { InMemoryRepositoryBase } from './in-memory-base'

/** Process-global backing store — survives Next.js module isolation. */
const GLOBAL_KEY = '__recall_poc_userStore__'
declare global {
  // eslint-disable-next-line no-var
  var __recall_poc_userStore__: Map<string, User> | undefined
}

function getGlobalStore(): Map<string, User> {
  // M-2 production fail-fast guard: in-memory stores are forbidden in production
  // to prevent accidental cross-tenant data exposure when this template is deployed.
  if (process.env.NODE_ENV === 'production' && process.env.MOCK_MODE !== 'true') {
    throw new Error(
      '[SEC] InMemoryUserRepository is forbidden in production. ' +
        'Set MOCK_MODE=true or replace with a persistent repository implementation.',
    )
  }
  if (!globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY] = new Map<string, User>()
  }
  return globalThis[GLOBAL_KEY] as Map<string, User>
}

@injectable()
export class InMemoryUserRepository
  extends InMemoryRepositoryBase<User>
  implements UserRepository
{
  /** Override the base-class store with the process-global Map. */
  protected override readonly store: Map<string, User> = getGlobalStore()

  /**
   * Reset the process-global store (for test isolation).
   * Call this in beforeEach when the global store must start empty.
   */
  static resetStore(): void {
    globalThis[GLOBAL_KEY] = new Map<string, User>()
  }
  async findById(id: string): Promise<Result<User, NotFoundError>> {
    const found = this.getById(id)
    return found ? ok(found) : err(new NotFoundError('User', id))
  }

  async findByEmail(email: Email): Promise<Result<User, NotFoundError>> {
    for (const user of this.store.values()) {
      if (user.email.value === email.value) return ok(user)
    }
    return err(new NotFoundError('User', `email=${email.value}`))
  }

  async findAll(): Promise<ReadonlyArray<User>> {
    return this.list()
  }

  async findPending(): Promise<ReadonlyArray<User>> {
    return Object.freeze(
      Array.from(this.store.values()).filter((u) => u.status === 'pending'),
    )
  }

  async save(
    user: User,
  ): Promise<Result<User, ConflictError | ExternalServiceError>> {
    for (const existing of this.store.values()) {
      if (existing.id !== user.id && existing.email.value === user.email.value) {
        return err(new ConflictError(`email ${user.email.value} already taken`))
      }
    }
    return ok(this.putById(user))
  }

  async delete(id: string): Promise<Result<void, NotFoundError>> {
    return this.removeById(id)
      ? ok(undefined)
      : err(new NotFoundError('User', id))
  }
}
