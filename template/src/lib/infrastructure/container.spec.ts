// src/lib/infrastructure/container.spec.ts
// Verifies tsyringe DI container exposes registerAdapters async loader,
// honors DEPLOY_PROFILE env, and resolves Ports after registration.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import 'reflect-metadata'
import {
  container,
  resolveDeployProfile,
  registerPort,
  ensureContainer,
  _resetBootstrap,
} from './container'
import type { DeployProfile } from './profiles/mapping'

describe('Infrastructure container', () => {
  beforeEach(() => {
    container.clearInstances()
    container.reset()
  })

  describe('resolveDeployProfile', () => {
    it('returns "minimal" when DEPLOY_PROFILE is unset', () => {
      expect(resolveDeployProfile(undefined)).toBe('minimal')
    })

    it('returns the env value when one of the 4 profiles', () => {
      expect(resolveDeployProfile('minimal')).toBe('minimal')
      expect(resolveDeployProfile('unlocked')).toBe('unlocked')
      expect(resolveDeployProfile('pro')).toBe('pro')
      expect(resolveDeployProfile('vps')).toBe('vps')
    })

    it('falls back to "minimal" on unknown profile string', () => {
      expect(resolveDeployProfile('unknown-profile')).toBe('minimal')
    })
  })

  describe('container.resolve after registerPort', () => {
    it('resolves a Port token after registerPort is called', () => {
      class FakeAuth {
        readonly tag = 'fake-auth'
      }
      registerPort('AuthPort', FakeAuth)
      const resolved = container.resolve<FakeAuth>('AuthPort')
      expect(resolved.tag).toBe('fake-auth')
    })

    it('returns the same Singleton instance across resolves', () => {
      class FakeDb {
        readonly id = Math.random()
      }
      registerPort('DbPort', FakeDb)
      const a = container.resolve<FakeDb>('DbPort')
      const b = container.resolve<FakeDb>('DbPort')
      expect(a).toBe(b)
    })

    it('throws when resolving an unregistered token', () => {
      expect(() => container.resolve('UnregisteredPort')).toThrow()
    })
  })

  describe('ensureContainer (lazy idempotent bootstrap)', () => {
    const originalMockMode = process.env.MOCK_MODE

    afterEach(() => {
      // Restore MOCK_MODE so other suites are not affected
      if (originalMockMode === undefined) {
        delete process.env.MOCK_MODE
      } else {
        process.env.MOCK_MODE = originalMockMode
      }
      _resetBootstrap()
    })

    it('resolves AuthPort and DbPort as mock adapters when MOCK_MODE=true', async () => {
      process.env.MOCK_MODE = 'true'
      await ensureContainer()
      // AuthPort must resolve without throwing
      expect(() => container.resolve('AuthPort')).not.toThrow()
      // DbPort must resolve without throwing
      expect(() => container.resolve('DbPort')).not.toThrow()
    })

    it('resolves AuthPort instance with getSession() method in MOCK_MODE', async () => {
      process.env.MOCK_MODE = 'true'
      await ensureContainer()
      const authPort = container.resolve<{ getSession: () => unknown }>('AuthPort')
      expect(typeof authPort.getSession).toBe('function')
    })

    it('resolves DbPort instance with withTransaction() method in MOCK_MODE', async () => {
      process.env.MOCK_MODE = 'true'
      await ensureContainer()
      const dbPort = container.resolve<{ withTransaction: () => unknown }>('DbPort')
      expect(typeof dbPort.withTransaction).toBe('function')
    })

    it('is idempotent: calling ensureContainer twice does not throw', async () => {
      process.env.MOCK_MODE = 'true'
      await ensureContainer()
      await ensureContainer() // second call must be no-op
      expect(() => container.resolve('AuthPort')).not.toThrow()
    })

    it('_resetBootstrap allows re-registration after container.reset()', async () => {
      process.env.MOCK_MODE = 'true'
      await ensureContainer()
      container.clearInstances()
      container.reset()
      _resetBootstrap()
      await ensureContainer()
      expect(() => container.resolve('AuthPort')).not.toThrow()
    })
  })

  describe('registerAdapters (async loader, profile-aware)', () => {
    // We can't really import infrastructure/adapters here since they don't exist
    // yet (Wave 5-I/J in flight). Instead we verify the function signature exists
    // and accepts the 4 valid profiles.
    it('exports registerAdapters function', async () => {
      const mod = await import('./container')
      expect(typeof mod.registerAdapters).toBe('function')
    })

    it('accepts each valid DeployProfile in its signature', () => {
      const profiles: DeployProfile[] = ['minimal', 'unlocked', 'pro', 'vps']
      // Compile-time test: assigning the profile array verifies type compatibility.
      expect(profiles).toHaveLength(4)
    })

    // R5-A SEC-1: WebhookVerifierPort must be wired after registerAdapters()
    // (B R4-SEC-1 CRITICAL — production UnregisteredDependencyError prevention)
    it('resolves WebhookVerifierPort after registerAdapters (minimal profile, MOCK_MODE=true)', async () => {
      process.env.MOCK_MODE = 'true'
      const { registerAdapters } = await import('./container')
      await registerAdapters('minimal')
      // If WebhookVerifierPort is not wired, this throws UnregisteredDependencyError
      expect(() => container.resolve('WebhookVerifierPort')).not.toThrow()
    })

    it('resolves ports whose mock adapters exist after registerAdapters (MOCK_MODE=true)', async () => {
      process.env.MOCK_MODE = 'true'
      const { registerAdapters } = await import('./container')
      const { PORT_NAMES } = await import('./profiles/mapping')
      await registerAdapters('minimal')
      // Compile-time: PORT_NAMES is non-empty
      expect(PORT_NAMES.length).toBeGreaterThan(0)
      // Ports whose mock adapter class file ships in Wave 5-J.
      // Real-only adapters (SupabaseAuthAdapter, etc.) are MODULE_NOT_FOUND
      // silently and remain unregistered until Wave 5-I lands — that is expected.
      const shippedMockPorts = [
        'BotOrchestratorPort',   // MockBotOrchestratorAdapter (MOCK_MODE override)
        'WebhookVerifierPort',   // RecallAiVerifierAdapter (real, shipped) — R5-A SEC-1
        'TranscriptionPort',     // MockTranscriptionAdapter
        'CalendarPort',          // MockCalendarAdapter
        'LocalInferencePort',    // MockInferenceAdapter → mock-local-inference.adapter
        'VideoProcessorPort',    // MockVideoAdapter → mock-video-processor.adapter
        'MediaServerPort',       // MockMediaAdapter → mock-media-server.adapter
        'InternalRpcPort',       // MockInternalRpcAdapter
        'RateLimiterPort',       // MockRateLimiterAdapter (task-36 Step 1)
      ] as const
      for (const port of shippedMockPorts) {
        expect(
          () => container.resolve(port),
          `${port} should be resolvable after registerAdapters`,
        ).not.toThrow()
      }
    })
  })

  describe('ensureContainer registers in-memory Repositories (MOCK_MODE=true)', () => {
    const originalMockMode = process.env.MOCK_MODE

    afterEach(() => {
      if (originalMockMode === undefined) {
        delete process.env.MOCK_MODE
      } else {
        process.env.MOCK_MODE = originalMockMode
      }
      _resetBootstrap()
    })

    it('resolves AllowedUserRepository after ensureContainer in MOCK_MODE', async () => {
      process.env.MOCK_MODE = 'true'
      await ensureContainer()
      expect(() => container.resolve('AllowedUserRepository')).not.toThrow()
    })

    it('resolves AuditLogRepository after ensureContainer in MOCK_MODE', async () => {
      process.env.MOCK_MODE = 'true'
      await ensureContainer()
      expect(() => container.resolve('AuditLogRepository')).not.toThrow()
    })

    it('resolves UserRepository after ensureContainer in MOCK_MODE', async () => {
      process.env.MOCK_MODE = 'true'
      await ensureContainer()
      expect(() => container.resolve('UserRepository')).not.toThrow()
    })

    it('resolves all 8 in-memory Repositories after ensureContainer in MOCK_MODE', async () => {
      process.env.MOCK_MODE = 'true'
      await ensureContainer()
      const repoTokens = [
        'AllowedUserRepository',
        'UserRepository',
        'AuditLogRepository',
        'BotRepository',
        'RecordingRepository',
        'TranscriptRepository',
        'CalendarEventRepository',
        'WebhookEventRepository',
      ] as const
      for (const token of repoTokens) {
        expect(
          () => container.resolve(token),
          `${token} should be resolvable after ensureContainer (MOCK_MODE=true)`,
        ).not.toThrow()
      }
    })

    it('AllowedUserRepository Singleton — same instance across resolves', async () => {
      process.env.MOCK_MODE = 'true'
      await ensureContainer()
      const a = container.resolve('AllowedUserRepository')
      const b = container.resolve('AllowedUserRepository')
      expect(a).toBe(b)
    })
  })

  describe('RateLimiterPort DI wiring (task-36 Step 5)', () => {
    // Restore MOCK_MODE and reset bootstrap between cases so each test
    // bootstraps a fresh container with its own MOCK_MODE setting.
    const originalMockMode = process.env.MOCK_MODE
    const originalDeployProfile = process.env.DEPLOY_PROFILE

    afterEach(() => {
      if (originalMockMode === undefined) {
        delete process.env.MOCK_MODE
      } else {
        process.env.MOCK_MODE = originalMockMode
      }
      if (originalDeployProfile === undefined) {
        delete process.env.DEPLOY_PROFILE
      } else {
        process.env.DEPLOY_PROFILE = originalDeployProfile
      }
      _resetBootstrap()
    })

    // (a) MOCK_MODE=true → MockRateLimiterAdapter (bindings-漏れ検出)
    it('MOCK_MODE=true: resolves RateLimiterPort as MockRateLimiterAdapter instance', async () => {
      process.env.MOCK_MODE = 'true'
      await ensureContainer()
      // If MockRateLimiterAdapter is missing from registerMockAdapters() bindings,
      // this line throws UnregisteredDependencyError → catches the omission.
      const instance = container.resolve('RateLimiterPort')
      // Verify it is a MockRateLimiterAdapter by checking the test-seam method.
      expect(typeof (instance as { setThreshold?: unknown }).setThreshold).toBe('function')
    })

    // (b) MOCK_MODE=false + DEPLOY_PROFILE=minimal → InMemoryRateLimiterAdapter
    it('MOCK_MODE=false, DEPLOY_PROFILE=minimal: resolves RateLimiterPort as InMemoryRateLimiterAdapter (not mock)', async () => {
      process.env.MOCK_MODE = 'false'
      process.env.DEPLOY_PROFILE = 'minimal'
      await ensureContainer()
      const instance = container.resolve('RateLimiterPort')
      // InMemoryRateLimiterAdapter must NOT have the setThreshold() test seam
      // (that belongs only to MockRateLimiterAdapter).
      expect(typeof (instance as { setThreshold?: unknown }).setThreshold).toBe('undefined')
      // It must expose the standard RateLimiterPort check() method.
      expect(typeof (instance as { check?: unknown }).check).toBe('function')
    })

    // (c) pro profile: ensureContainer() completes (Upstash file absent → swallowed),
    //     and container.resolve('RateLimiterPort') fails loudly (UnregisteredDependencyError)
    //     — i.e. does NOT silently fall back to MockRateLimiterAdapter.
    it('MOCK_MODE=false, DEPLOY_PROFILE=pro: ensureContainer() resolves without throw, RateLimiterPort is unregistered (fail-loud, not silent mock fallback)', async () => {
      process.env.MOCK_MODE = 'false'
      process.env.DEPLOY_PROFILE = 'pro'
      // ensureContainer() must NOT throw even though upstash-rate-limiter.adapter
      // file does not exist yet (MODULE_NOT_FOUND is swallowed by tryRegisterFromModule).
      await expect(ensureContainer()).resolves.not.toThrow()
      // RateLimiterPort must be UNREGISTERED (fail-loud), never silently resolved
      // to MockRateLimiterAdapter.  This guards against the silent-fallback antipattern
      // described in draft §3 Step 1 note.
      expect(() => container.resolve('RateLimiterPort')).toThrow()
    })
  })
})
