import { describe, it, expect } from 'vitest'
import { GetOrganizationSettingsUseCase } from './get-organization-settings.use-case'
import type { DbPort } from '../ports/db.port'
import { ExternalServiceError } from '@/lib/domain/errors'

describe('GetOrganizationSettingsUseCase (signature)', () => {
  const dbPort = {} as DbPort

  it('is constructible with DbPort', () => {
    const uc = new GetOrganizationSettingsUseCase(dbPort)
    expect(uc).toBeInstanceOf(GetOrganizationSettingsUseCase)
  })

  it('exposes execute()', () => {
    const uc = new GetOrganizationSettingsUseCase(dbPort)
    expect(typeof uc.execute).toBe('function')
  })

  it('returns Result.err(ExternalServiceError) "not implemented: Step 3"', async () => {
    const uc = new GetOrganizationSettingsUseCase(dbPort)
    const r = await uc.execute()
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toBeInstanceOf(ExternalServiceError)
      expect(r.error.message).toContain('not implemented: Step 3')
    }
  })
})
