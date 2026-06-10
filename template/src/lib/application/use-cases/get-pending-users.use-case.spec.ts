import { describe, it, expect, vi } from 'vitest'
import { GetPendingUsersUseCase } from './get-pending-users.use-case'
import type { UserRepository } from '../repositories/user.repository'
import type { User } from '@/lib/domain/entities'
import { createEmail } from '@/lib/domain/value-objects/email'

const makeEmail = (s: string) => {
  const r = createEmail(s)
  if (!r.ok) throw new Error('bad email in test')
  return r.value
}

const makePendingUser = (id: string): User => ({
  id,
  email: makeEmail(`${id}@example.com`),
  role: 'member',
  status: 'pending',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
})

describe('GetPendingUsersUseCase', () => {
  it('returns ok(pending users) from repository', async () => {
    const pendingUsers = [makePendingUser('p1'), makePendingUser('p2')]
    const findPending = vi.fn().mockResolvedValue(pendingUsers)
    const userRepo = { findPending, findAll: vi.fn(), findById: vi.fn(), findByEmail: vi.fn(), save: vi.fn(), delete: vi.fn() } as unknown as UserRepository

    const uc = new GetPendingUsersUseCase(userRepo)
    const result = await uc.execute()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toHaveLength(2)
      expect(result.value[0].status).toBe('pending')
    }
    expect(findPending).toHaveBeenCalledOnce()
  })

  it('returns ok([]) when no pending users exist', async () => {
    const findPending = vi.fn().mockResolvedValue([])
    const userRepo = { findPending, findAll: vi.fn(), findById: vi.fn(), findByEmail: vi.fn(), save: vi.fn(), delete: vi.fn() } as unknown as UserRepository

    const uc = new GetPendingUsersUseCase(userRepo)
    const result = await uc.execute()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toHaveLength(0)
    }
  })
})
