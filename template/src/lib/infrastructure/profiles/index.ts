// src/lib/infrastructure/profiles/index.ts
// Barrel for the 4 Deploy Profile mappings (draft 06 §3.2).
// Per-profile views are exported as Readonly objects to make container.ts
// resolution explicit while keeping a single source of truth in mapping.ts.

import { PROFILE_ADAPTER_MAPPING, type ProfileMapping } from './mapping'

export const minimal: ProfileMapping = PROFILE_ADAPTER_MAPPING.minimal
export const unlocked: ProfileMapping = PROFILE_ADAPTER_MAPPING.unlocked
export const pro: ProfileMapping = PROFILE_ADAPTER_MAPPING.pro
export const vps: ProfileMapping = PROFILE_ADAPTER_MAPPING.vps

export {
  PROFILE_ADAPTER_MAPPING,
  DEPLOY_PROFILES,
  PORT_NAMES,
  type DeployProfile,
  type PortName,
  type ProfileMapping,
} from './mapping'
