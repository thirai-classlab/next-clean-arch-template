// apps/web/playwright.config.ts
// E2E test config (Wave 6-M). MOCK_MODE フロー前提、Supabase 不要。

import { defineConfig, devices } from '@playwright/test'

const PORT = 3000
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  // task-4 Step 5 iter 2-F (H-01): CI 時は blob reporter を併用し
  // `playwright merge-reports` cmd で 4 shard 分の結果を 1 つに統合できるようにする。
  // junit は外部 CI ダッシュボード連携用、list は人間が log で確認する用、
  // blob は merge-reports の入力形式 (`.zip`) 要件を満たすため。
  reporter: process.env.CI
    ? [
        ['blob', { outputDir: 'blob-report' }],
        ['junit', { outputFile: 'test-results/e2e.xml' }],
        ['list'],
      ]
    : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    // middleware が `/` を 307 redirect するため、matcher で除外される `/_next/static/*` (常に 200) で ready 判定する。
    // 公式 doc: https://playwright.dev/docs/test-webserver — playwright 1.60 では 2xx のみ ready とみなすため
    // 404 (favicon) や 307 (root) では reuse 判定に失敗 → command 再 spawn → EADDRINUSE になる。
    // /api/* は tsyringe DI が dev server で resolve 漏れし 500 を返すため不適 (別 issue、本 task scope 外)。
    url: `${BASE_URL}/_next/static/development/_buildManifest.js`,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      MOCK_MODE: 'true',
      // middleware の role 判定は mock_session cookie 経由で有効。
      // Phase A/B/C spec はすべて mock_session cookie を使用し role enforcement が動作する。
      NODE_ENV: 'development',
    },
  },
})
