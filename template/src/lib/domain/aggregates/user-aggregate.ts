// src/lib/domain/aggregates/user-aggregate.ts
// UserAggregate — User + AllowedUser + pendingEvents の集約 root。
// draft 06 §1.3 L249-260 準拠。TS pure interface に method を実装持てないため
// function-based pattern (Object.freeze + spread) で immutable transition を実現。

import type { User } from '../entities/user'
import type { AllowedUser } from '../entities/allowed-user'
import type { Role } from '../value-objects/role'
import type {
  DomainEvent,
  UserApprovedEvent,
  UserRoleChangedEvent,
} from '../events'
import { type Result, ok, err } from '@/lib/application/result'
import { ValidationError } from '../errors/validation-error'

export interface UserAggregate {
  readonly user: User
  readonly allowedUser: AllowedUser | null
  readonly pendingEvents: ReadonlyArray<DomainEvent>
}

export function createUserAggregate(
  user: User,
  allowedUser: AllowedUser | null = null,
): UserAggregate {
  return Object.freeze({
    user,
    allowedUser,
    pendingEvents: Object.freeze([] as ReadonlyArray<DomainEvent>),
  })
}

function appendEvent(
  agg: UserAggregate,
  newUser: User,
  event: DomainEvent,
): UserAggregate {
  return Object.freeze({
    ...agg,
    user: newUser,
    pendingEvents: Object.freeze([...agg.pendingEvents, event]),
  })
}

export function approveUser(
  agg: UserAggregate,
  adminId: string,
): Result<UserAggregate, ValidationError> {
  if (agg.user.status !== 'pending') {
    return err(
      new ValidationError(
        `cannot approve user in status ${agg.user.status}`,
      ),
    )
  }
  const newUser: User = { ...agg.user, status: 'approved', updatedAt: new Date() }
  const event: UserApprovedEvent = {
    eventType: 'UserApproved',
    occurredAt: new Date(),
    payload: { userId: agg.user.id, approvedBy: adminId },
  }
  return ok(appendEvent(agg, newUser, event))
}

export function rejectUser(
  agg: UserAggregate,
  _adminId: string,
  _reason: string,
): Result<UserAggregate, ValidationError> {
  if (agg.user.status !== 'pending') {
    return err(
      new ValidationError(
        `cannot reject user in status ${agg.user.status}`,
      ),
    )
  }
  const newUser: User = { ...agg.user, status: 'rejected', updatedAt: new Date() }
  // reject 専用 event は draft 未定義のため pendingEvents は不変 (UserApprovedEvent 系のみ)。
  // reason / adminId は将来 audit-log 連携時に使う。
  return ok(
    Object.freeze({
      ...agg,
      user: newUser,
    }),
  )
}

export function changeUserRole(
  agg: UserAggregate,
  newRole: Role,
  adminId: string,
): Result<UserAggregate, ValidationError> {
  if (agg.user.status !== 'approved') {
    return err(
      new ValidationError(
        `cannot change role for user in status ${agg.user.status}`,
      ),
    )
  }
  const oldRole = agg.user.role
  const newUser: User = { ...agg.user, role: newRole, updatedAt: new Date() }
  const event: UserRoleChangedEvent = {
    eventType: 'UserRoleChanged',
    occurredAt: new Date(),
    payload: { userId: agg.user.id, oldRole, newRole, changedBy: adminId },
  }
  return ok(appendEvent(agg, newUser, event))
}
