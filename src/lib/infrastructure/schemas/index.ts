// src/lib/infrastructure/schemas/index.ts
// zod schema placement scaffolding (draft 06 §3.5).
//
// Placement rules (SSoT):
// - REST DTO / WS payload schemas → `packages/contracts/src/<entity>.schema.ts`
//   (shared between apps/web and apps/desktop)
// - Infrastructure-internal schemas (env validation, correlation IDs,
//   deploy-profile inputs) → THIS directory
// - Domain Entity types → `src/lib/domain/entities/` (pure TypeScript, no zod)
// - DB row shapes → repository-local in `src/lib/infrastructure/repositories/`
//
// Only sample schemas live here for Wave 5-H. Real DTO schemas land in
// packages/contracts in a later task.

import { z } from 'zod'

export const CorrelationIdSchema = z.string().min(1)
export type CorrelationId = z.infer<typeof CorrelationIdSchema>

export const DeployProfileSchema = z.enum(['minimal', 'unlocked', 'pro', 'vps'])
export type DeployProfileInput = z.infer<typeof DeployProfileSchema>
