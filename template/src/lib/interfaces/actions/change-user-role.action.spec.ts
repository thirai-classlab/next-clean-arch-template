// src/lib/interfaces/actions/change-user-role.action.spec.ts
// Draft 06 §4.2 — Server Action thin wrapper for ChangeUserRoleUseCase.
//
// Uses factory mock pattern (same as Route Handler tests): mocks
// createChangeUserRoleUseCase() and getAuthenticatedSession() so the
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
  createChangeUserRoleUseCase: () => mockCreateUseCase(),
}))

const mockGetAuthenticatedSession = vi.fn()
vi.mock(
  '@/lib/interfaces/actions/_shared/auth-helper',
  () => ({
    getAuthenticatedSession: () => mockGetAuthenticatedSession(),
  }),
)

import { changeUserRoleAction } from './change-user-role.action'
import { revalidatePath } from 'next/cache'
import { ExternalServiceError } from '@/lib/domain/errors'

const adminSession = { userId: 'admin-1', role: 'admin' as const }
const memberSession = { userId: 'member-1', role: 'member' as const }

describe('changeUserRoleAction', () => {
  beforeEach(() => {
    mockGetAuthenticatedSession.mockReset()
    mockCreateUseCase.mockReset()
    vi.mocked(revalidatePath).mockClear()
  })

  it('returns { error: "Unauthorized" } when session is null', async () => {
    // Arrange
    mockGetAuthenticatedSession.mockResolvedValue(null)

    // Act
    const result = await changeUserRoleAction('user-99', 'member')

    // Assert
    expect(result).toEqual({ error: 'Unauthorized' })
    expect(revalidatePath).not.toHaveBeenCalled()
    expect(mockCreateUseCase).not.toHaveBeenCalled()
  })

  it('returns { error: "Forbidden" } when session role is not admin', async () => {
    // Arrange
    mockGetAuthenticatedSession.mockResolvedValue(memberSession)

    // Act
    const result = await changeUserRoleAction('user-99', 'member')

    // Assert
    expect(result).toEqual({ error: 'Forbidden' })
    expect(revalidatePath).not.toHaveBeenCalled()
    expect(mockCreateUseCase).not.toHaveBeenCalled()
  })

  it('returns { success: true } and revalidates /admin/users on UseCase success', async () => {
    // Arrange
    mockGetAuthenticatedSession.mockResolvedValue(adminSession)
    const useCase = {
      execute: vi.fn().mockResolvedValue({
        ok: true,
        value: { id: 'user-99', role: 'admin' },
      }),
    }
    mockCreateUseCase.mockReturnValue(useCase)

    // Act
    const result = await changeUserRoleAction('user-99', 'admin')

    // Assert
    expect(useCase.execute).toHaveBeenCalledWith({
      userId: 'user-99',
      newRole: 'admin',
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
        error: new ExternalServiceError('role change denied', null),
      }),
    }
    mockCreateUseCase.mockReturnValue(useCase)

    // Act
    const result = await changeUserRoleAction('user-99', 'viewer')

    // Assert
    expect(result).toEqual({
      error: 'External service error: role change denied',
    })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  // ============================================================================
  // B SEC-H6 (Round-1 HIGH): self-demote guard at API layer.
  //   admin が自分自身を非 admin に変更する操作は changeUserRoleAction の冒頭で reject される。
  //   DB trigger 009_last_admin_protection.sql は role 数のみ判定するため、self check は API 層担当。
  // ============================================================================
  it('rejects self-demote (target == self, newRole != admin) with self_demote_forbidden', async () => {
    // Arrange
    mockGetAuthenticatedSession.mockResolvedValue(adminSession)
    const useCase = { execute: vi.fn() }
    mockCreateUseCase.mockReturnValue(useCase)

    // okSession.value.userId = 'admin-1'。同 ID へ member 変更 = self-demote。
    // Act
    const result = await changeUserRoleAction('admin-1', 'member')

    // Assert
    expect(result).toEqual({ error: 'self_demote_forbidden' })
    expect(useCase.execute).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('rejects self-demote to viewer with self_demote_forbidden', async () => {
    // Arrange
    mockGetAuthenticatedSession.mockResolvedValue(adminSession)
    const useCase = { execute: vi.fn() }
    mockCreateUseCase.mockReturnValue(useCase)

    // Act
    const result = await changeUserRoleAction('admin-1', 'viewer')

    // Assert
    expect(result).toEqual({ error: 'self_demote_forbidden' })
    expect(useCase.execute).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('allows self-role-update when newRole stays admin (no-op self-update)', async () => {
    // 「自分を admin のままに保つ」操作は API 層で reject しない (DB 側も no-op で trigger 不発)。
    // Arrange
    mockGetAuthenticatedSession.mockResolvedValue(adminSession)
    const useCase = {
      execute: vi.fn().mockResolvedValue({
        ok: true,
        value: { id: 'admin-1', role: 'admin' },
      }),
    }
    mockCreateUseCase.mockReturnValue(useCase)

    // Act
    const result = await changeUserRoleAction('admin-1', 'admin')

    // Assert
    expect(result).toEqual({ success: true })
    expect(useCase.execute).toHaveBeenCalledWith({
      userId: 'admin-1',
      newRole: 'admin',
      adminId: 'admin-1',
    })
  })

  it('allows demoting other admin (target != self) — last-admin race protection is DB trigger', async () => {
    // 他 admin の demote は API 層では素通り (DB trigger 009 が race-safe に最終判定)。
    // Arrange
    mockGetAuthenticatedSession.mockResolvedValue(adminSession)
    const useCase = {
      execute: vi.fn().mockResolvedValue({
        ok: true,
        value: { id: 'other-admin', role: 'member' },
      }),
    }
    mockCreateUseCase.mockReturnValue(useCase)

    // Act
    const result = await changeUserRoleAction('other-admin', 'member')

    // Assert
    expect(result).toEqual({ success: true })
    expect(useCase.execute).toHaveBeenCalledWith({
      userId: 'other-admin',
      newRole: 'member',
      adminId: 'admin-1',
    })
  })
})
