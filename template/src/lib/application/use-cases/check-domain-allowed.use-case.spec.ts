import { describe, it, expect } from 'vitest'
import { CheckDomainAllowedUseCase } from './check-domain-allowed.use-case'
import type { AllowedUserRepository } from '../repositories/allowed-user.repository'
import { ExternalServiceError } from '@/lib/domain/errors'

describe('CheckDomainAllowedUseCase (signature)', () => {
  const allowedUserRepo = {} as AllowedUserRepository

  it('is constructible with AllowedUserRepository', () => {
    const uc = new CheckDomainAllowedUseCase(allowedUserRepo)
    expect(uc).toBeInstanceOf(CheckDomainAllowedUseCase)
  })

  it('exposes execute()', () => {
    const uc = new CheckDomainAllowedUseCase(allowedUserRepo)
    expect(typeof uc.execute).toBe('function')
  })

  it('returns Result.err(ExternalServiceError) "not implemented: Step 3"', async () => {
    const uc = new CheckDomainAllowedUseCase(allowedUserRepo)
    const r = await uc.execute({ email: 'a@b.com' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toBeInstanceOf(ExternalServiceError)
      expect(r.error.message).toContain('not implemented: Step 3')
    }
  })
})
