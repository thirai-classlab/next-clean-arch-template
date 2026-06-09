import { describe, it, expect } from 'vitest'
import { USER_STATUSES, type UserStatus } from './user-status'

describe('UserStatus VO', () => {
  it('lists exactly pending / approved / rejected / suspended', () => {
    expect(USER_STATUSES).toEqual([
      'pending',
      'approved',
      'rejected',
      'suspended',
    ])
  })

  it('USER_STATUSES is frozen at runtime', () => {
    expect(Object.isFrozen(USER_STATUSES)).toBe(true)
  })

  it('UserStatus literals are valid values', () => {
    const s: UserStatus = 'approved'
    expect(USER_STATUSES.includes(s)).toBe(true)
  })
})
