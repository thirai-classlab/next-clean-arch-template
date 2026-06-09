import { describe, it, expect } from 'vitest'
import { ROLES, type Role } from './role'

describe('Role VO', () => {
  it('lists exactly admin / member / viewer', () => {
    expect(ROLES).toEqual(['admin', 'member', 'viewer'])
  })

  it('ROLES tuple is frozen / readonly at runtime', () => {
    // `as const` produces readonly tuple — Object.isFrozen confirms runtime guard
    expect(Object.isFrozen(ROLES)).toBe(true)
  })

  it('Role type literals are usable as values', () => {
    const r: Role = 'admin'
    expect(ROLES.includes(r)).toBe(true)
  })
})
