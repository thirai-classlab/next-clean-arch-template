// src/lib/infrastructure/profiles/mapping.spec.ts
// Verifies the Deploy Profile × 16 Port adapter mapping table
// matches draft 06 §3.2 + task-36 (original 4 profiles = 64 entries)
// vps-next-postgres addition (5 profiles = 80 entries total)
// vps-next-mariadb addition (6 profiles = 96 entries total).

import { describe, it, expect } from 'vitest'
import {
  PROFILE_ADAPTER_MAPPING,
  DEPLOY_PROFILES,
  PORT_NAMES,
  type DeployProfile,
  type PortName,
} from './mapping'

describe('PROFILE_ADAPTER_MAPPING (draft 06 §3.2)', () => {
  it('lists exactly 6 Deploy Profiles (4 original + vps-next-postgres + vps-next-mariadb)', () => {
    expect(DEPLOY_PROFILES).toEqual(['minimal', 'unlocked', 'pro', 'vps', 'vps-next-postgres', 'vps-next-mariadb'])
  })

  it('lists exactly 16 Port names', () => {
    expect(PORT_NAMES).toHaveLength(16)
  })

  it('declares an adapter for every (profile × port) combination = 96 entries', () => {
    let count = 0
    for (const profile of DEPLOY_PROFILES) {
      for (const port of PORT_NAMES) {
        const adapter = PROFILE_ADAPTER_MAPPING[profile][port]
        expect(typeof adapter).toBe('string')
        expect(adapter.length).toBeGreaterThan(0)
        count++
      }
    }
    expect(count).toBe(96)
  })

  it('maps AuthPort to SupabaseAuthAdapter on the 4 original profiles', () => {
    const supabaseProfiles: DeployProfile[] = ['minimal', 'unlocked', 'pro', 'vps']
    for (const profile of supabaseProfiles) {
      expect(PROFILE_ADAPTER_MAPPING[profile].AuthPort).toBe('SupabaseAuthAdapter')
    }
  })

  it('maps AuthPort to NextAuthAdapter on vps-next-postgres', () => {
    expect(PROFILE_ADAPTER_MAPPING['vps-next-postgres'].AuthPort).toBe('NextAuthAdapter')
  })

  it('maps AuthPort to NextAuthAdapter on vps-next-mariadb', () => {
    expect(PROFILE_ADAPTER_MAPPING['vps-next-mariadb'].AuthPort).toBe('NextAuthAdapter')
  })

  it('maps QueuePort to BullMQ on vps profiles and VercelQueue on Vercel profiles', () => {
    expect(PROFILE_ADAPTER_MAPPING.minimal.QueuePort).toBe('VercelQueueAdapter')
    expect(PROFILE_ADAPTER_MAPPING.unlocked.QueuePort).toBe('VercelQueueAdapter')
    expect(PROFILE_ADAPTER_MAPPING.pro.QueuePort).toBe('VercelQueueAdapter')
    expect(PROFILE_ADAPTER_MAPPING.vps.QueuePort).toBe('RailwayBullMQAdapter')
    expect(PROFILE_ADAPTER_MAPPING['vps-next-postgres'].QueuePort).toBe('RailwayBullMQAdapter')
    expect(PROFILE_ADAPTER_MAPPING['vps-next-mariadb'].QueuePort).toBe('RailwayBullMQAdapter')
  })

  it('maps DbPort to PostgresDb on vps profiles and SupabaseDb on Vercel profiles', () => {
    expect(PROFILE_ADAPTER_MAPPING.minimal.DbPort).toBe('SupabaseDbAdapter')
    expect(PROFILE_ADAPTER_MAPPING.vps.DbPort).toBe('PostgresDbAdapter')
    expect(PROFILE_ADAPTER_MAPPING['vps-next-postgres'].DbPort).toBe('PostgresDbAdapter')
    expect(PROFILE_ADAPTER_MAPPING['vps-next-mariadb'].DbPort).toBe('PostgresDbAdapter')
  })

  it('maps RateLimiterPort to InMemoryRateLimiterAdapter on vps-next-postgres', () => {
    expect(PROFILE_ADAPTER_MAPPING['vps-next-postgres'].RateLimiterPort).toBe(
      'InMemoryRateLimiterAdapter',
    )
  })

  it('maps RateLimiterPort to InMemoryRateLimiterAdapter on vps-next-mariadb', () => {
    expect(PROFILE_ADAPTER_MAPPING['vps-next-mariadb'].RateLimiterPort).toBe(
      'InMemoryRateLimiterAdapter',
    )
  })

  it('exposes types DeployProfile and PortName', () => {
    const profile: DeployProfile = 'minimal'
    const port: PortName = 'AuthPort'
    expect(profile).toBe('minimal')
    expect(port).toBe('AuthPort')
  })
})
