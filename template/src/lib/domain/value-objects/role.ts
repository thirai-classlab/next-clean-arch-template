// src/lib/domain/value-objects/role.ts
// Role VO — closed union of admin / member / viewer.

export const ROLES = Object.freeze(['admin', 'member', 'viewer'] as const)
export type Role = (typeof ROLES)[number]
