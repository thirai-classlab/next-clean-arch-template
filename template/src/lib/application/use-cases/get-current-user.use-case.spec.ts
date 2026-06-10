import { describe, it, expect, vi } from 'vitest'
import { GetCurrentUserUseCase } from './get-current-user.use-case'
import type { UserRepository } from '../repositories/user.repository'
import { ok, err } from '../result'
import { NotFoundError } from '@/lib/domain/errors'
import { createEmail } from '@/lib/domain/value-objects/email'

const makeEmail = (s: string) => {
  const r = createEmail(s)
  if (!r.ok) throw new Error('bad email in test')
  return r.value
}

const mockUser = {
  id: 'user-1',
  email: makeEmail('user@example.com'),
  role: 'admin' as const,
  status: 'approved' as const,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

describe('GetCurrentUserUseCase', () => {
  it('returns ok(User) when user is found', async () => {
    const findById = vi.fn().mockResolvedValue(ok(mockUser))
    const userRepo = { findById, findAll: vi.fn(), findByEmail: vi.fn(), findPending: vi.fn(), save: vi.fn(), delete: vi.fn() } as unknown as UserRepository

    const uc = new GetCurrentUserUseCase(userRepo)
    const result = await uc.execute({ userId: 'user-1' })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.id).toBe('user-1')
      expect(result.value.role).toBe('admin')
    }
    expect(findById).toHaveBeenCalledWith('user-1')
  })

  it('returns err(NotFoundError) when user does not exist', async () => {
    const findById = vi.fn().mockResolvedValue(err(new NotFoundError('User', 'missing-id')))
    const userRepo = { findById, findAll: vi.fn(), findByEmail: vi.fn(), findPending: vi.fn(), save: vi.fn(), delete: vi.fn() } as unknown as UserRepository

    const uc = new GetCurrentUserUseCase(userRepo)
    const result = await uc.execute({ userId: 'missing-id' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NotFoundError)
    }
  })
})
