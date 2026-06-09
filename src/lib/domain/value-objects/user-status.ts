// src/lib/domain/value-objects/user-status.ts
// UserStatus VO — lifecycle states of an end user account.

export const USER_STATUSES = Object.freeze([
  'pending',
  'approved',
  'rejected',
  'suspended',
] as const)
export type UserStatus = (typeof USER_STATUSES)[number]
