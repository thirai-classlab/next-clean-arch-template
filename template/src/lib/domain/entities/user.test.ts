import { describe, it, expect } from 'vitest'
import type { User } from './user'
import { createEmail } from '../value-objects/email'

describe('User entity', () => {
  it('構造一致: 全 field が型付け Email / Role / UserStatus / Date を持つ', () => {
    const emailResult = createEmail('alice@example.com')
    if (!emailResult.ok) throw new Error('email factory failed')

    const user: User = {
      id: 'user-1',
      email: emailResult.value,
      role: 'admin',
      status: 'approved',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-02T00:00:00Z'),
    }

    expect(user.id).toBe('user-1')
    expect(user.email.value).toBe('alice@example.com')
    expect(user.email._brand).toBe('Email')
    expect(user.role).toBe('admin')
    expect(user.status).toBe('approved')
    expect(user.createdAt).toBeInstanceOf(Date)
    expect(user.updatedAt).toBeInstanceOf(Date)
  })

  it('readonly: role の mutation は型エラー', () => {
    const emailResult = createEmail('bob@example.com')
    if (!emailResult.ok) throw new Error('email factory failed')

    const user: User = {
      id: 'user-2',
      email: emailResult.value,
      role: 'member',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // @ts-expect-error - role is readonly
    user.role = 'admin'
    expect(user.role).toBe('admin') // runtime mutation succeeds, but type-check rejects
  })

  it('readonly: id の mutation は型エラー', () => {
    const emailResult = createEmail('c@example.com')
    if (!emailResult.ok) throw new Error('email factory failed')

    const user: User = {
      id: 'user-3',
      email: emailResult.value,
      role: 'viewer',
      status: 'suspended',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // @ts-expect-error - id is readonly
    user.id = 'user-x'
    expect(user.id).toBe('user-x')
  })
})
