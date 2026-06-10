// src/lib/interfaces/actions/approve-user.action.spec.ts
// Draft 06 §4.2 — Server Action thin wrapper for ApproveUserUseCase.
//
// Uses factory mock pattern (same as Route Handler tests): mocks
// createApproveUserUseCase() and getAuthenticatedSession() so the
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
  createApproveUserUseCase: () => mockCreateUseCase(),
}))

const mockGetAuthenticatedSession = vi.fn()
vi.mock(
  '@/lib/interfaces/actions/_shared/auth-helper',
  () => ({
    getAuthenticatedSession: () => mockGetAuthenticatedSession(),
  }),
)

import { approveUserAction } from './approve-user.action'
import { revalidatePath } from 'next/cache'
import { ExternalServiceError } from '@/lib/domain/errors'

const adminSession = { userId: 'admin-1', role: 'admin' as const }
const memberSession = { userId: 'member-1', role: 'member' as const }

describe('approveUserAction', () => {
  beforeEach(() => {
    mockGetAuthenticatedSession.mockReset()
    mockCreateUseCase.mockReset()
    vi.mocked(revalidatePath).mockClear()
  })

  it('returns { error: "Unauthorized" } when session is null', async () => {
    // Arrange
    mockGetAuthenticatedSession.mockResolvedValue(null)

    // Act
    const result = await approveUserAction('user-99')

    // Assert
    expect(result).toEqual({ error: 'Unauthorized' })
    expect(revalidatePath).not.toHaveBeenCalled()
    expect(mockCreateUseCase).not.toHaveBeenCalled()
  })

  it('returns { error: "Forbidden" } when session role is not admin', async () => {
    // Arrange
    mockGetAuthenticatedSession.mockResolvedValue(memberSession)

    // Act
    const result = await approveUserAction('user-99')

    // Assert
    expect(result).toEqual({ error: 'Forbidden' })
    expect(revalidatePath).not.toHaveBeenCalled()
    expect(mockCreateUseCase).not.toHaveBeenCalled()
  })

  it('returns { success: true } and revalidates /admin/users on UseCase success', async () => {
    // Arrange
    mockGetAuthenticatedSession.mockResolvedValue(adminSession)
    const useCase = {
      execute: vi.fn().mockResolvedValue({ ok: true, value: { id: 'user-99' } }),
    }
    mockCreateUseCase.mockReturnValue(useCase)

    // Act
    const result = await approveUserAction('user-99')

    // Assert
    expect(useCase.execute).toHaveBeenCalledWith({
      userId: 'user-99',
      adminId: 'admin-1',
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
        error: new ExternalServiceError('boom', null),
      }),
    }
    mockCreateUseCase.mockReturnValue(useCase)

    // Act
    const result = await approveUserAction('user-99')

    // Assert
    expect(result).toEqual({ error: 'External service error: boom' })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
