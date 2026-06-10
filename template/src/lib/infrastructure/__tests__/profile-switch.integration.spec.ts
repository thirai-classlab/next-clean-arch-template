// src/lib/infrastructure/__tests__/profile-switch.integration.spec.ts
// Wave 6 / task-1 Step 5 + task-36 Step 5: 4 Deploy Profile mapping completeness
// + minimal-profile container resolution end-to-end smoke. (draft 06 §3.1-3.3)
//
// Strategy:
// - mapping table: assert 4 Profile × 16 Port = 64 entries are all non-empty strings.
// - minimal Profile resolve smoke: directly registerPort the 16 Mock adapters + 8
//   InMemory repositories, then container.resolve each and verify the resolved
//   instance is an instance of the expected concrete class.
// - DEPLOY_PROFILE env switch: resolveDeployProfile honors env values minimal/
//   unlocked/pro/vps, falls back to 'minimal' for missing/unknown values.
// - unlocked/pro/vps: mapping completeness only (concrete adapters not yet
//   implemented in this Wave; Phase 3 will land them).

import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  container,
  registerPort,
  resolveDeployProfile,
} from '../container'
import {
  DEPLOY_PROFILES,
  PORT_NAMES,
  PROFILE_ADAPTER_MAPPING,
  type DeployProfile,
} from '../profiles/mapping'
import { REPOSITORY_TOKENS } from '../../application/repositories'

import {
  MockAuthAdapter,
  MockDbAdapter,
  MockRealtimeAdapter,
  MockStorageAdapter,
  MockQueueAdapter,
  MockEmailAdapter,
  MockBotOrchestratorAdapter,
  MockTranscriptionAdapter,
  MockCalendarAdapter,
  MockLocalInferenceAdapter,
  MockVideoProcessorAdapter,
  MockContinuousMonitoringAdapter,
  MockMediaServerAdapter,
  MockWebhookVerifierAdapter,
  MockInternalRpcAdapter,
} from '../adapters/mock'
import { MockRateLimiterAdapter } from '../adapters/mock/mock-rate-limiter.adapter'
import {
  InMemoryUserRepository,
  InMemoryAllowedUserRepository,
  InMemoryBotRepository,
  InMemoryRecordingRepository,
  InMemoryTranscriptRepository,
  InMemoryCalendarEventRepository,
  InMemoryWebhookEventRepository,
  InMemoryAuditLogRepository,
} from '../repositories/in-memory'

/** 16 Port → Mock adapter class (minimal Profile). */
const MINIMAL_PORT_BINDINGS = [
  ['AuthPort', MockAuthAdapter],
  ['DbPort', MockDbAdapter],
  ['RealtimePort', MockRealtimeAdapter],
  ['StoragePort', MockStorageAdapter],
  ['QueuePort', MockQueueAdapter],
  ['EmailPort', MockEmailAdapter],
  ['BotOrchestratorPort', MockBotOrchestratorAdapter],
  ['TranscriptionPort', MockTranscriptionAdapter],
  ['CalendarPort', MockCalendarAdapter],
  ['LocalInferencePort', MockLocalInferenceAdapter],
  ['VideoProcessorPort', MockVideoProcessorAdapter],
  ['ContinuousMonitoringPort', MockContinuousMonitoringAdapter],
  ['MediaServerPort', MockMediaServerAdapter],
  ['WebhookVerifierPort', MockWebhookVerifierAdapter],
  ['InternalRpcPort', MockInternalRpcAdapter],
  ['RateLimiterPort', MockRateLimiterAdapter],
] as const

/** 8 Repository token → InMemory implementation (minimal Profile). */
const MINIMAL_REPO_BINDINGS = [
  [REPOSITORY_TOKENS.UserRepository, InMemoryUserRepository],
  [REPOSITORY_TOKENS.AllowedUserRepository, InMemoryAllowedUserRepository],
  [REPOSITORY_TOKENS.BotRepository, InMemoryBotRepository],
  [REPOSITORY_TOKENS.RecordingRepository, InMemoryRecordingRepository],
  [REPOSITORY_TOKENS.TranscriptRepository, InMemoryTranscriptRepository],
  [REPOSITORY_TOKENS.CalendarEventRepository, InMemoryCalendarEventRepository],
  [REPOSITORY_TOKENS.WebhookEventRepository, InMemoryWebhookEventRepository],
  [REPOSITORY_TOKENS.AuditLogRepository, InMemoryAuditLogRepository],
] as const

describe('Profile switch — mapping completeness', () => {
  it('exposes exactly 6 Deploy Profiles (4 original + vps-next-postgres + vps-next-mariadb)', () => {
    expect(DEPLOY_PROFILES).toEqual(['minimal', 'unlocked', 'pro', 'vps', 'vps-next-postgres', 'vps-next-mariadb'])
  })

  it('exposes exactly 16 Port names', () => {
    expect(PORT_NAMES).toHaveLength(16)
  })

  it('defines all 6 × 16 = 96 adapter bindings as non-empty class-name strings', () => {
    const profiles = DEPLOY_PROFILES as ReadonlyArray<DeployProfile>
    let count = 0
    for (const profile of profiles) {
      const mapping = PROFILE_ADAPTER_MAPPING[profile]
      for (const port of PORT_NAMES) {
        const adapterName = mapping[port]
        expect(typeof adapterName, `${profile}.${port}`).toBe('string')
        expect(adapterName.length, `${profile}.${port}`).toBeGreaterThan(0)
        count += 1
      }
    }
    expect(count).toBe(96)
  })

  it('each profile mapping is frozen (immutable per draft 06 §3.2)', () => {
    for (const profile of DEPLOY_PROFILES) {
      expect(Object.isFrozen(PROFILE_ADAPTER_MAPPING[profile])).toBe(true)
    }
    expect(Object.isFrozen(PROFILE_ADAPTER_MAPPING)).toBe(true)
  })
})

describe('Profile switch — DEPLOY_PROFILE env resolution', () => {
  it.each([
    ['minimal', 'minimal'],
    ['unlocked', 'unlocked'],
    ['pro', 'pro'],
    ['vps', 'vps'],
    ['vps-next-postgres', 'vps-next-postgres'],
    ['vps-next-mariadb', 'vps-next-mariadb'],
  ])('resolveDeployProfile(%s) → %s', (input, expected) => {
    expect(resolveDeployProfile(input)).toBe(expected)
  })

  it('falls back to "minimal" for undefined env', () => {
    expect(resolveDeployProfile(undefined)).toBe('minimal')
  })

  it('falls back to "minimal" for unknown env value', () => {
    expect(resolveDeployProfile('staging-experimental')).toBe('minimal')
  })
})

describe('Profile switch — minimal Profile container.resolve smoke', () => {
  beforeEach(() => {
    container.clearInstances()
    container.reset()
  })

  it('resolves all 16 Port tokens to Mock adapter instances', () => {
    for (const [token, Cls] of MINIMAL_PORT_BINDINGS) {
      registerPort(token, Cls as new (...args: never[]) => unknown)
    }
    for (const [token, Cls] of MINIMAL_PORT_BINDINGS) {
      const resolved = container.resolve(token)
      expect(resolved, `Port ${token}`).toBeInstanceOf(Cls)
    }
  })

  it('resolves all 8 Repository tokens to InMemory instances', () => {
    for (const [token, Cls] of MINIMAL_REPO_BINDINGS) {
      registerPort(token as unknown as string, Cls as new (...args: never[]) => unknown)
    }
    for (const [token, Cls] of MINIMAL_REPO_BINDINGS) {
      const resolved = container.resolve(token as unknown as string)
      expect(resolved, `Repository ${token.toString()}`).toBeInstanceOf(Cls)
    }
  })

  it('Singleton lifecycle: same instance returned across resolves', () => {
    registerPort('AuthPort', MockAuthAdapter)
    const a = container.resolve('AuthPort')
    const b = container.resolve('AuthPort')
    expect(a).toBe(b)
  })
})

describe('Profile switch — unlocked/pro/vps mapping (adapter impl deferred)', () => {
  // Phase 3 will land Recall.ai / Google Calendar / Supabase / Ollama / etc.
  // For now we only assert the mapping table exposes the expected class names.
  it('unlocked Profile maps BotOrchestratorPort → RecallAiBotAdapter', () => {
    expect(PROFILE_ADAPTER_MAPPING.unlocked.BotOrchestratorPort).toBe(
      'RecallAiBotAdapter',
    )
  })

  it('pro Profile maps LocalInferencePort → OllamaInferenceAdapter', () => {
    expect(PROFILE_ADAPTER_MAPPING.pro.LocalInferencePort).toBe(
      'OllamaInferenceAdapter',
    )
  })

  it('vps Profile maps DbPort → PostgresDbAdapter (self-hosted)', () => {
    expect(PROFILE_ADAPTER_MAPPING.vps.DbPort).toBe('PostgresDbAdapter')
  })

  it('vps Profile maps StoragePort → S3CompatibleStorageAdapter', () => {
    expect(PROFILE_ADAPTER_MAPPING.vps.StoragePort).toBe(
      'S3CompatibleStorageAdapter',
    )
  })
})
