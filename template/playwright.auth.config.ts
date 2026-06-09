// apps/web/playwright.auth.config.ts
// task-37 Step 6 — Playwright config for LOGIN_STRATEGY=email-pass E2E tests.
//
// Usage:
//   npx playwright test --config=playwright.auth.config.ts
//   pnpm --filter @recall-poc/web exec playwright test --config=playwright.auth.config.ts
//
// This config starts the dev server with LOGIN_STRATEGY=email-pass and
// RATE_LIMIT_ENABLED=true (required by env-schema superRefine #5: email-pass
// without rate-limit is a startup error).
//
// Test targets: e2e/auth/sign-in.spec.ts Suite B (email-pass strategy)
//               e2e/auth-rate-limit.spec.ts (429 + Retry-After surface)

import { defineConfig, devices } from '@playwright/test'

const PORT = 3001 // Different port from default (3000) to allow parallel execution
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  testMatch: [
    'auth/sign-in.spec.ts',
    'auth-rate-limit.spec.ts',
  ],
  grep: /LOGIN_STRATEGY=email-pass|LOGIN_STRATEGY=both|ConditionalShell|auth rate-limit/,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false, // Serial: single dev server, avoid state conflicts
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium-auth',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    url: `${BASE_URL}/_next/static/development/_buildManifest.js`,
    timeout: 120_000,
    reuseExistingServer: false, // Always start fresh to guarantee env injection
    env: {
      PORT: String(PORT),
      MOCK_MODE: 'true',
      NODE_ENV: 'development',
      // email-pass strategy requires rate-limit to be enabled (superRefine #5).
      LOGIN_STRATEGY: 'email-pass',
      RATE_LIMIT_ENABLED: 'true',
      // Low threshold for E2E: 2 attempts allowed → 3rd is rate-limited.
      // Keeps the test fast while exercising the real applyRateLimit → 429 path.
      RATE_LIMIT_MAX_ATTEMPTS: '2',
    },
  },
})
