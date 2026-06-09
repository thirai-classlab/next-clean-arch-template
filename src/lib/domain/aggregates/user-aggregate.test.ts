import { describe, it, expect } from 'vitest'
import {
  createUserAggregate,
  approveUser,
  rejectUser,
  changeUserRole,
} from './user-aggregate'
import type { User } from '../entities/user'
import type { AllowedUser } from '../entities/allowed-user'
import { createEmail } from '../value-objects/email'
import { ValidationError } from '../errors/validation-error'
import type { UserApprovedEvent, UserRoleChangedEvent } from '../events'

function buildUser(overrides: Partial<User> = {}): User {
  const emailResult = createEmail('alice@example.com')
  if (!emailResult.ok) throw new Error('email factory failed')
  return {
    id: 'user-1',
    email: emailResult.value,
    role: 'member',
    status: 'pending',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

function buildAllowedUser(): AllowedUser {
  const emailResult = createEmail('alice@example.com')
  if (!emailResult.ok) throw new Error('email factory failed')
  return {
    id: 'allowed-1',
    email: emailResult.value,
    addedBy: 'admin-0',
    addedAt: new Date('2025-12-01T00:00:00Z'),
  }
}

describe('UserAggregate factory', () => {
  it('createUserAggregate: user 単体で生成、pendingEvents は空配列', () => {
    const agg = createUserAggregate(buildUser())
    expect(agg.user.id).toBe('user-1')
    expect(agg.allowedUser).toBeNull()
    expect(agg.pendingEvents).toEqual([])
  })

  it('createUserAggregate: allowedUser を持って生成可能', () => {
    const agg = createUserAggregate(buildUser(), buildAllowedUser())
    expect(agg.allowedUser?.id).toBe('allowed-1')
  })

  it('immutability: factory 出力は frozen', () => {
    const agg = createUserAggregate(buildUser())
    expect(Object.isFrozen(agg)).toBe(true)
    expect(Object.isFrozen(agg.pendingEvents)).toBe(true)
  })
})

describe('approveUser', () => {
  it('pending → approved に遷移、UserApprovedEvent を pendingEvents に追加', () => {
    const agg = createUserAggregate(buildUser({ status: 'pending' }))
    const result = approveUser(agg, 'admin-1')
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unexpected err')
    expect(result.value.user.status).toBe('approved')
    expect(result.value.pendingEvents).toHaveLength(1)
    const event = result.value.pendingEvents[0] as UserApprovedEvent
    expect(event.eventType).toBe('UserApproved')
    expect(event.payload.userId).toBe('user-1')
    expect(event.payload.approvedBy).toBe('admin-1')
  })

  it('approved の user を再度 approve すると ValidationError', () => {
    const agg = createUserAggregate(buildUser({ status: 'approved' }))
    const result = approveUser(agg, 'admin-1')
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unexpected ok')
    expect(result.error).toBeInstanceOf(ValidationError)
  })

  it('rejected の user を approve すると ValidationError', () => {
    const agg = createUserAggregate(buildUser({ status: 'rejected' }))
    const result = approveUser(agg, 'admin-1')
    expect(result.ok).toBe(false)
  })

  it('immutability: 元の aggregate は変化しない', () => {
    const agg = createUserAggregate(buildUser({ status: 'pending' }))
    approveUser(agg, 'admin-1')
    expect(agg.user.status).toBe('pending')
    expect(agg.pendingEvents).toHaveLength(0)
  })

  it('immutability: 新 aggregate も frozen', () => {
    const agg = createUserAggregate(buildUser({ status: 'pending' }))
    const result = approveUser(agg, 'admin-1')
    if (!result.ok) throw new Error('unexpected err')
    expect(Object.isFrozen(result.value)).toBe(true)
    expect(Object.isFrozen(result.value.pendingEvents)).toBe(true)
  })
})

describe('rejectUser', () => {
  it('pending → rejected に遷移', () => {
    const agg = createUserAggregate(buildUser({ status: 'pending' }))
    const result = rejectUser(agg, 'admin-1', 'spam account')
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unexpected err')
    expect(result.value.user.status).toBe('rejected')
  })

  it('approved の user を reject すると ValidationError', () => {
    const agg = createUserAggregate(buildUser({ status: 'approved' }))
    const result = rejectUser(agg, 'admin-1', 'reason')
    expect(result.ok).toBe(false)
  })
})

describe('changeUserRole', () => {
  it('approved の user は role 変更可能、UserRoleChangedEvent 追加', () => {
    const agg = createUserAggregate(
      buildUser({ status: 'approved', role: 'member' }),
    )
    const result = changeUserRole(agg, 'admin', 'admin-1')
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unexpected err')
    expect(result.value.user.role).toBe('admin')
    const event = result.value.pendingEvents[0] as UserRoleChangedEvent
    expect(event.eventType).toBe('UserRoleChanged')
    expect(event.payload.oldRole).toBe('member')
    expect(event.payload.newRole).toBe('admin')
    expect(event.payload.changedBy).toBe('admin-1')
  })

  it('pending の user は role 変更不可', () => {
    const agg = createUserAggregate(buildUser({ status: 'pending' }))
    const result = changeUserRole(agg, 'admin', 'admin-1')
    expect(result.ok).toBe(false)
  })

  it('rejected の user は role 変更不可', () => {
    const agg = createUserAggregate(buildUser({ status: 'rejected' }))
    const result = changeUserRole(agg, 'admin', 'admin-1')
    expect(result.ok).toBe(false)
  })
})
