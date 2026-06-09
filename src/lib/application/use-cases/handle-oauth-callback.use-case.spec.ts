import { describe, it, expect } from 'vitest'
import { HandleOAuthCallbackUseCase } from './handle-oauth-callback.use-case'
import type { AuthPort } from '../ports/auth.port'
import type { UserRepository } from '../repositories/user.repository'
import type { AllowedUserRepository } from '../repositories/allowed-user.repository'
import { ExternalServiceError } from '@/lib/domain/errors'

describe('HandleOAuthCallbackUseCase (signature)', () => {
  const authPort = {} as AuthPort
  const userRepo = {} as UserRepository
  const allowedUserRepo = {} as AllowedUserRepository

  it('is constructible with AuthPort + 2 repos', () => {
    const uc = new HandleOAuthCallbackUseCase(authPort, userRepo, allowedUserRepo)
    expect(uc).toBeInstanceOf(HandleOAuthCallbackUseCase)
  })

  it('exposes execute()', () => {
    const uc = new HandleOAuthCallbackUseCase(authPort, userRepo, allowedUserRepo)
    expect(typeof uc.execute).toBe('function')
  })

  it('returns Result.err(ExternalServiceError) "not implemented: Step 3"', async () => {
    const uc = new HandleOAuthCallbackUseCase(authPort, userRepo, allowedUserRepo)
    const r = await uc.execute({ code: 'c', state: 's' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toBeInstanceOf(ExternalServiceError)
      expect(r.error.message).toContain('not implemented: Step 3')
    }
  })
})
