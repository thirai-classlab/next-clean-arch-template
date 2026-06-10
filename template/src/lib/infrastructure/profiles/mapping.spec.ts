// src/lib/infrastructure/profiles/mapping.spec.ts
// Verifies the 4 Deploy Profile × 16 Port adapter mapping table
// matches draft 06 §3.2 + task-36 (64 entries total).

import { describe, it, expect } from 'vitest'
import {
  PROFILE_ADAPTER_MAPPING,
  DEPLOY_PROFILES,
  PORT_NAMES,
  type DeployProfile,
  type PortName,
} from './mapping'

describe('PROFILE_ADAPTER_MAPPING (draft 06 §3.2)', () => {
  it('lists exactly 4 Deploy Profiles', () => {
    expect(DEPLOY_PROFILES).toEqual(['minimal', 'unlocked', 'pro', 'vps'])
  })

  it('lists exactly 16 Port names', () => {
    expect(PORT_NAMES).toHaveLength(16)
  })

  it('declares an adapter for every (profile × port) combination = 64 entries', () => {
    let count = 0
    for (const profile of DEPLOY_PROFILES) {
      for (const port of PORT_NAMES) {
        const adapter = PROFILE_ADAPTER_MAPPING[profile][port]
        expect(typeof adapter).toBe('string')
        expect(adapter.length).toBeGreaterThan(0)
        count++
      }
    }
    expect(count).toBe(64)
  })

  it('maps AuthPort to SupabaseAuthAdapter on all 4 profiles', () => {
    for (const profile of DEPLOY_PROFILES) {
      expect(PROFILE_ADAPTER_MAPPING[profile].AuthPort).toBe('SupabaseAuthAdapter')
    }
  })

  it('maps QueuePort to BullMQ on vps and VercelQueue elsewhere', () => {
    expect(PROFILE_ADAPTER_MAPPING.minimal.QueuePort).toBe('VercelQueueAdapter')
    expect(PROFILE_ADAPTER_MAPPING.unlocked.QueuePort).toBe('VercelQueueAdapter')
    expect(PROFILE_ADAPTER_MAPPING.pro.QueuePort).toBe('VercelQueueAdapter')
    expect(PROFILE_ADAPTER_MAPPING.vps.QueuePort).toBe('RailwayBullMQAdapter')
  })

  it('maps DbPort to PostgresDb on vps and SupabaseDb elsewhere', () => {
    expect(PROFILE_ADAPTER_MAPPING.minimal.DbPort).toBe('SupabaseDbAdapter')
    expect(PROFILE_ADAPTER_MAPPING.vps.DbPort).toBe('PostgresDbAdapter')
  })

  it('exposes types DeployProfile and PortName', () => {
    const profile: DeployProfile = 'minimal'
    const port: PortName = 'AuthPort'
    expect(profile).toBe('minimal')
    expect(port).toBe('AuthPort')
  })
})
