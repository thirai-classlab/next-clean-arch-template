// src/lib/infrastructure/schemas/index.spec.ts
// Verifies zod schema placement is wired: barrel exports + sample schemas parse.

import { describe, it, expect } from 'vitest'
import {
  CorrelationIdSchema,
  DeployProfileSchema,
  type CorrelationId,
  type DeployProfileInput,
} from './index'

describe('Infrastructure schemas (placement scaffolding)', () => {
  describe('CorrelationIdSchema', () => {
    it('parses a non-empty string', () => {
      const result = CorrelationIdSchema.safeParse('abc-123')
      expect(result.success).toBe(true)
      if (result.success) {
        const id: CorrelationId = result.data
        expect(id).toBe('abc-123')
      }
    })

    it('rejects empty string', () => {
      const result = CorrelationIdSchema.safeParse('')
      expect(result.success).toBe(false)
    })

    it('rejects non-string', () => {
      const result = CorrelationIdSchema.safeParse(42)
      expect(result.success).toBe(false)
    })
  })

  describe('DeployProfileSchema', () => {
    it('accepts each of the 4 valid profiles', () => {
      for (const profile of ['minimal', 'unlocked', 'pro', 'vps'] as const) {
        const result = DeployProfileSchema.safeParse(profile)
        expect(result.success).toBe(true)
      }
    })

    it('rejects an invalid profile string', () => {
      const result = DeployProfileSchema.safeParse('staging')
      expect(result.success).toBe(false)
    })

    it('exposes a DeployProfileInput type alias', () => {
      const p: DeployProfileInput = 'minimal'
      expect(p).toBe('minimal')
    })
  })
})
