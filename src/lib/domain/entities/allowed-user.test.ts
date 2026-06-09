import { describe, it, expect } from 'vitest'
import type { AllowedUser } from './allowed-user'
import { createEmail } from '../value-objects/email'

describe('AllowedUser entity', () => {
  it('構造一致: email VO + addedBy / addedAt を持つ', () => {
    const emailResult = createEmail('newuser@example.com')
    if (!emailResult.ok) throw new Error('email factory failed')

    const au: AllowedUser = {
      id: 'au-1',
      email: emailResult.value,
      addedBy: 'admin-user-1',
      addedAt: new Date('2026-01-01T00:00:00Z'),
    }

    expect(au.id).toBe('au-1')
    expect(au.email.value).toBe('newuser@example.com')
    expect(au.email._brand).toBe('Email')
    expect(au.addedBy).toBe('admin-user-1')
    expect(au.addedAt).toBeInstanceOf(Date)
  })

  it('readonly: email 差し替えは型エラー', () => {
    const emailA = createEmail('a@example.com')
    const emailB = createEmail('b@example.com')
    if (!emailA.ok || !emailB.ok) throw new Error('email factory failed')

    const au: AllowedUser = {
      id: 'au-2',
      email: emailA.value,
      addedBy: 'admin-1',
      addedAt: new Date(),
    }

    // @ts-expect-error - email is readonly
    au.email = emailB.value
    expect(au.email.value).toBe('b@example.com')
  })

  it('readonly: addedBy 差し替えは型エラー', () => {
    const emailResult = createEmail('c@example.com')
    if (!emailResult.ok) throw new Error('email factory failed')

    const au: AllowedUser = {
      id: 'au-3',
      email: emailResult.value,
      addedBy: 'admin-1',
      addedAt: new Date(),
    }

    // @ts-expect-error - addedBy is readonly
    au.addedBy = 'admin-2'
    expect(au.addedBy).toBe('admin-2')
  })
})
