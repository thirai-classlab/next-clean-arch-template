// src/lib/domain/entities/allowed-user.ts
// AllowedUser entity — pre-approved email allowed to register / be invited.

import type { Email } from '../value-objects/email'

export interface AllowedUser {
  readonly id: string
  readonly email: Email
  readonly addedBy: string
  readonly addedAt: Date
}
