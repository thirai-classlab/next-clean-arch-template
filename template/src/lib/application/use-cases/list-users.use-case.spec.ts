import { describe, it, expect, vi } from 'vitest'
import { ListUsersUseCase } from './list-users.use-case'
import type { UserRepository } from '../repositories/user.repository'
import type { User } from '@/lib/domain/entities'
import { createEmail } from '@/lib/domain/value-objects/email'

const makeEmail = (s: string) => {
  const r = createEmail(s)
  if (!r.ok) throw new Error('bad email in test')
  return r.value
}

const makeUser = (id: string): User => ({
  id,
  email: makeEmail(`${id}@example.com`),
  role: 'member',
  status: 'approved',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
})

describe('ListUsersUseCase', () => {
  it('returns ok({ users, total }) with paginated results', async () => {
    const allUsers = [makeUser('u1'), makeUser('u2'), makeUser('u3')]
    const findAll = vi.fn().mockResolvedValue(allUsers)
    const userRepo = { findAll, findById: vi.fn(), findByEmail: vi.fn(), findPending: vi.fn(), save: vi.fn(), delete: vi.fn() } as unknown as UserRepository

    const uc = new ListUsersUseCase(userRepo)
    const result = await uc.execute({ page: 1, limit: 2 })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.total).toBe(3)
      expect(result.value.users).toHaveLength(2)
      expect(result.value.users[0].id).toBe('u1')
      expect(result.value.users[1].id).toBe('u2')
    }
  })

  it('returns the second page correctly', async () => {
    const allUsers = [makeUser('u1'), makeUser('u2'), makeUser('u3')]
    const findAll = vi.fn().mockResolvedValue(allUsers)
    const userRepo = { findAll, findById: vi.fn(), findByEmail: vi.fn(), findPending: vi.fn(), save: vi.fn(), delete: vi.fn() } as unknown as UserRepository

    const uc = new ListUsersUseCase(userRepo)
    const result = await uc.execute({ page: 2, limit: 2 })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.total).toBe(3)
      expect(result.value.users).toHaveLength(1)
      expect(result.value.users[0].id).toBe('u3')
    }
  })

  it('returns ok with empty users when repository is empty', async () => {
    const findAll = vi.fn().mockResolvedValue([])
    const userRepo = { findAll, findById: vi.fn(), findByEmail: vi.fn(), findPending: vi.fn(), save: vi.fn(), delete: vi.fn() } as unknown as UserRepository

    const uc = new ListUsersUseCase(userRepo)
    const result = await uc.execute({ page: 1, limit: 20 })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.total).toBe(0)
      expect(result.value.users).toHaveLength(0)
    }
  })
})
