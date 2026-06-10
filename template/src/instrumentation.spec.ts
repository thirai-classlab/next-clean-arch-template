// apps/web/src/instrumentation.spec.ts
//
// Verifies the production startup safeguard in instrumentation.ts.
// The hook MUST throw a [SEC]-tagged Error iff
//   NODE_ENV === 'production' AND MOCK_MODE === 'true'.
// In every other combination it must resolve silently.
//
// (The former dev admin bypass guard was removed permanently in
//  task: remove-dev-admin-bypass — the bypass env no longer exists, so
//  there is nothing to fail-fast on for it.)
//
// Implementation note:
//   `register()` reads `process.env.*` at invocation time (not at module
//   evaluation time), so a single dynamic import per test is sufficient
//   to exercise different env combinations.

import { afterEach, describe, expect, it, vi } from 'vitest'

describe('instrumentation.register() — MOCK_MODE production guard (S-01)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('throws when NODE_ENV=production AND MOCK_MODE=true', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('MOCK_MODE', 'true')

    const mod = await import('./instrumentation')
    await expect(mod.register()).rejects.toThrow(/\[SEC\]/)
  })

  it('throws when NODE_ENV=production AND MOCK_MODE=true AND DEPLOY_PROFILE=vps-next-postgres (build-time exception must NOT extend to runtime)', async () => {
    // env-schema refinement 4 permits vps-next-postgres + MOCK_MODE=true for
    // build-time verification. This test pins that the runtime guard still
    // refuses to boot in that combination (mock auth bypass guard).
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('MOCK_MODE', 'true')
    vi.stubEnv('DEPLOY_PROFILE', 'vps-next-postgres')

    const mod = await import('./instrumentation')
    await expect(mod.register()).rejects.toThrow(/\[SEC\].*vps-next-postgres/s)
  })

  it('does not throw when NODE_ENV=production AND MOCK_MODE unset', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('MOCK_MODE', '')

    const mod = await import('./instrumentation')
    await expect(mod.register()).resolves.toBeUndefined()
  })

  it('does not throw when NODE_ENV=production AND MOCK_MODE=false', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('MOCK_MODE', 'false')

    const mod = await import('./instrumentation')
    await expect(mod.register()).resolves.toBeUndefined()
  })

  it('does not throw when NODE_ENV=development AND MOCK_MODE=true (local dev preserved)', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('MOCK_MODE', 'true')

    const mod = await import('./instrumentation')
    await expect(mod.register()).resolves.toBeUndefined()
  })

  it('does not throw when NODE_ENV=test AND MOCK_MODE=true', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('MOCK_MODE', 'true')

    const mod = await import('./instrumentation')
    await expect(mod.register()).resolves.toBeUndefined()
  })
})
