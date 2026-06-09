// apps/web/playwright.both.config.ts
// task-37 Step 6 — Playwright config for LOGIN_STRATEGY=both E2E tests.
//
// Usage:
//   npx playwright test --config=playwright.both.config.ts
//   pnpm --filter @recall-poc/web exec playwright test --config=playwright.both.config.ts
//
// This config starts the dev server with LOGIN_STRATEGY=both and
// RATE_LIMIT_ENABLED=true (required by env-schema superRefine #5).
//
// Test targets: e2e/auth/sign-in.spec.ts Suite C (both: Tabs SSO+email-pass)

import { defineConfig, devices } from '@playwright/test'

const PORT = 3002 // Separate port for both-strategy dev server
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  testMatch: ['auth/sign-in.spec.ts'],
  grep: /LOGIN_STRATEGY=both|ConditionalShell/,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
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
      name: 'chromium-both',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    url: `${BASE_URL}/_next/static/development/_buildManifest.js`,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      PORT: String(PORT),
      MOCK_MODE: 'true',
      NODE_ENV: 'development',
      // both strategy requires rate-limit to be enabled (superRefine #5).
      LOGIN_STRATEGY: 'both',
      RATE_LIMIT_ENABLED: 'true',
    },
  },
})
