// src/lib/interfaces/actions/reject-user.action.spec.ts
// Draft 06 §4.2 — Server Action thin wrapper for RejectUserUseCase.
//
// Uses factory mock pattern (same as Route Handler tests): mocks
// createRejectUserUseCase() and getAuthenticatedSession() so the
// action remains a thin co-ordinator test without real DI container.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/infrastructure/container', () => ({
  ensureContainer: vi.fn().mockResolvedValue(undefined),
}))

const mockCreateUseCase = vi.fn()
vi.mock('@/app/api/_shared/use-case-factories', () => ({
  createRejectUserUseCase: () => mockCreateUseCase(),
}))

const mockGetAuthenticatedSession = vi.fn()
vi.mock(
  '@/lib/interfaces/actions/_shared/auth-helper',
  () => ({
    getAuthenticatedSession: () => mockGetAuthenticatedSession(),
  }),
)

import { rejectUserAction } from './reject-user.action'
import { revalidatePath } from 'next/cache'
import { ExternalServiceError } from '@/lib/domain/errors'

const adminSession = { userId: 'admin-1', role: 'admin' as const }
const memberSession = { userId: 'member-1', role: 'member' as const }

describe('rejectUserAction', () => {
  beforeEach(() => {
    mockGetAuthenticatedSession.mockReset()
    mockCreateUseCase.mockReset()
    vi.mocked(revalidatePath).mockClear()
  })

  it('returns { error: "Unauthorized" } when session is null', async () => {
    // Arrange
    mockGetAuthenticatedSession.mockResolvedValue(null)

    // Act
    const result = await rejectUserAction('user-99', 'spam')

    // Assert
    expect(result).toEqual({ error: 'Unauthorized' })
    expect(revalidatePath).not.toHaveBeenCalled()
    expect(mockCreateUseCase).not.toHaveBeenCalled()
  })

  it('returns { error: "Forbidden" } when session role is not admin', async () => {
    // Arrange
    mockGetAuthenticatedSession.mockResolvedValue(memberSession)

    // Act
    const result = await rejectUserAction('user-99', 'spam')

    // Assert
    expect(result).toEqual({ error: 'Forbidden' })
    expect(revalidatePath).not.toHaveBeenCalled()
    expect(mockCreateUseCase).not.toHaveBeenCalled()
  })

  it('returns { success: true } and revalidates /admin/users on UseCase success', async () => {
    // Arrange
    mockGetAuthenticatedSession.mockResolvedValue(adminSession)
    const useCase = {
      execute: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    }
    mockCreateUseCase.mockReturnValue(useCase)

    // Act
    const result = await rejectUserAction('user-99', 'spam')

    // Assert
    expect(useCase.execute).toHaveBeenCalledWith({
      userId: 'user-99',
      adminId: 'admin-1',
      reason: 'spam',
    })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/users')
    expect(result).toEqual({ success: true })
  })

  it('returns { error } when UseCase fails', async () => {
    // Arrange
    mockGetAuthenticatedSession.mockResolvedValue(adminSession)
    const useCase = {
      execute: vi.fn().mockResolvedValue({
        ok: false,
        error: new ExternalServiceError('reject failed', null),
      }),
    }
    mockCreateUseCase.mockReturnValue(useCase)

    // Act
    const result = await rejectUserAction('user-99', 'spam')

    // Assert
    expect(result).toEqual({ error: 'External service error: reject failed' })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
