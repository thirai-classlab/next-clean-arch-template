// src/lib/application/use-cases/get-organization-settings.use-case.ts
// Draft 06 §1.4 Admin#6 — fetch org-level settings (defaults + feature flags).
// OrganizationSettings is currently only used by this UseCase; Step 3 may
// promote it to `domain/entities/` once persistence is wired.

import type { DbPort } from '../ports/db.port'
import type { Result } from '../result'
import type { DomainError } from '@/lib/domain/errors'
import { err } from '../result'
import { ExternalServiceError } from '@/lib/domain/errors'

export interface OrganizationSettings {
  readonly defaultRegion: string
  readonly autoJoinEnabled: boolean
  readonly transcriptionProvider: string
}

export class GetOrganizationSettingsUseCase {
  constructor(private readonly dbPort: DbPort) {}

  async execute(): Promise<Result<OrganizationSettings, DomainError>> {
    return err(new ExternalServiceError('not implemented: Step 3', null))
  }
}
