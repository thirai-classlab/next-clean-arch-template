// src/lib/infrastructure/repositories/prisma/prisma-user.repository.ts
// PrismaUserRepository — UserRepository implementation for vps-next-postgres profile.
//
// Maps Prisma User rows (flat DB record with string email, Role enum, UserStatus)
// to domain User entities (Email branded VO, readonly shape).
//
// Used by:
//   - NextAuthAdapter (Credentials authorize() direct Prisma call — bypasses this repo)
//   - Application use-cases (ChangeUserRoleUseCase, ApproveUserUseCase, etc.)
//     when DEPLOY_PROFILE=vps-next-postgres via DI container.
//
// Registration: registered as 'UserRepository' token in container.ts when
// DEPLOY_PROFILE=vps-next-postgres and MOCK_MODE !== 'true'.

import 'reflect-metadata'
import { injectable } from 'tsyringe'
import type { UserRepository } from '@/lib/application/repositories/user.repository'
import { ok, err, type Result } from '@/lib/application/result'
import type { User } from '@/lib/domain/entities'
import { createEmail, type Email } from '@/lib/domain/value-objects/email'
import { toRole, type Role } from '@/lib/domain/value-objects/role'
import { USER_STATUSES, type UserStatus } from '@/lib/domain/value-objects/user-status'
import {
  ConflictError,
  ExternalServiceError,
  NotFoundError,
} from '@/lib/domain/errors'
import { prisma } from '@/lib/infrastructure/prisma'

const SERVICE = 'prisma-user-repository'

/**
 * Narrow a raw string to a valid UserStatus. Returns null for unrecognized values.
 */
function toUserStatus(value: string): UserStatus | null {
  return (USER_STATUSES as readonly string[]).includes(value)
    ? (value as UserStatus)
    : null
}

/**
 * Map a Prisma user row to a domain User entity.
 * Throws if the row contains unexpected/invalid enum values (data integrity guard).
 */
function toDomainUser(row: {
  id: string
  email: string
  role: string
  status: string
  createdAt: Date
  updatedAt: Date
}): User {
  const emailResult = createEmail(row.email)
  if (!emailResult.ok) {
    throw new Error(
      `[PrismaUserRepository] Invalid email in DB row id=${row.id}: ${row.email}`,
    )
  }

  const role = toRole(row.role)
  if (!role) {
    throw new Error(
      `[PrismaUserRepository] Unrecognized role in DB row id=${row.id}: ${row.role}`,
    )
  }

  const status = toUserStatus(row.status)
  if (!status) {
    throw new Error(
      `[PrismaUserRepository] Unrecognized status in DB row id=${row.id}: ${row.status}`,
    )
  }

  return Object.freeze({
    id: row.id,
    email: emailResult.value,
    role,
    status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  })
}

@injectable()
export class PrismaUserRepository implements UserRepository {
  async findById(id: string): Promise<Result<User, NotFoundError>> {
    try {
      const row = await prisma.user.findUnique({ where: { id } })
      if (!row) return err(new NotFoundError('User', id))
      return ok(toDomainUser(row))
    } catch (cause) {
      // Map unexpected DB errors to NotFoundError for the UserRepository contract.
      // (ExternalServiceError is not in the findById return type per the interface.)
      return err(new NotFoundError('User', id))
    }
  }

  async findByEmail(email: Email): Promise<Result<User, NotFoundError>> {
    try {
      const row = await prisma.user.findUnique({
        where: { email: email.value },
      })
      if (!row) return err(new NotFoundError('User', `email=${email.value}`))
      return ok(toDomainUser(row))
    } catch {
      return err(new NotFoundError('User', `email=${email.value}`))
    }
  }

  async findAll(): Promise<ReadonlyArray<User>> {
    const rows = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } })
    return Object.freeze(rows.map(toDomainUser))
  }

  async findPending(): Promise<ReadonlyArray<User>> {
    const rows = await prisma.user.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
    })
    return Object.freeze(rows.map(toDomainUser))
  }

  async save(
    user: User,
  ): Promise<Result<User, ConflictError | ExternalServiceError>> {
    try {
      // Upsert semantics: create if not exists, update fields if exists by id.
      // Email uniqueness is enforced at DB level — catch P2002 (unique constraint).
      const row = await prisma.user.upsert({
        where: { id: user.id },
        create: {
          id: user.id,
          email: user.email.value,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        update: {
          email: user.email.value,
          role: user.role,
          status: user.status,
          updatedAt: user.updatedAt,
        },
      })
      return ok(toDomainUser(row))
    } catch (cause) {
      // Prisma error code P2002 = unique constraint violation (email already taken).
      if (
        cause instanceof Error &&
        'code' in cause &&
        (cause as { code: string }).code === 'P2002'
      ) {
        return err(
          new ConflictError(`email ${user.email.value} already taken`),
        )
      }
      return err(new ExternalServiceError(SERVICE, cause))
    }
  }

  async delete(id: string): Promise<Result<void, NotFoundError>> {
    try {
      await prisma.user.delete({ where: { id } })
      return ok(undefined as void)
    } catch (cause) {
      // Prisma error code P2025 = record not found for delete.
      if (
        cause instanceof Error &&
        'code' in cause &&
        (cause as { code: string }).code === 'P2025'
      ) {
        return err(new NotFoundError('User', id))
      }
      // Other errors (FK constraint, etc.) — surface as NotFoundError per interface.
      return err(new NotFoundError('User', id))
    }
  }
}
