// src/lib/domain/entities/user.ts
// User entity — application user with role + lifecycle status.

import type { Email } from '../value-objects/email'
import type { Role } from '../value-objects/role'
import type { UserStatus } from '../value-objects/user-status'

export interface User {
  readonly id: string
  readonly email: Email
  readonly role: Role
  readonly status: UserStatus
  readonly createdAt: Date
  readonly updatedAt: Date
}
