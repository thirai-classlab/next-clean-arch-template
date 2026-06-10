// src/lib/domain/value-objects/region.ts
// Region VO — supported Recall.ai deployment regions.

export const REGIONS = Object.freeze([
  'us-east-1',
  'eu-west-1',
  'ap-northeast-1',
] as const)
export type Region = (typeof REGIONS)[number]
