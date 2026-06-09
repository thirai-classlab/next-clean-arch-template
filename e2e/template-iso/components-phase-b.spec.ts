/**
 * apps/web/e2e/template-iso/components-phase-b.spec.ts
 *
 * Task-7 Step 2 — Template Isolated Test: Component Library Phase B smoke
 * H-03 decision: split into 3 files (phase-a / phase-b / phase-c).
 *
 * Phase B scope (task-3 complete):
 *   Composite × 7: Modal / Drawer / Tooltip / Popover / Tabs / Form / Table
 *
 * DRY strategy:
 *   Detailed per-component specs already exist in:
 *     apps/web/e2e/components/composite/*.spec.ts       (7 basic smoke specs)
 *     apps/web/e2e/composite/*.spec.ts                  (interactive / keyboard specs)
 *   This template-iso spec provides a thin integration smoke that verifies
 *   the gallery renders all 7 composite component cards without duplicating
 *   per-variant interaction assertions.
 *
 * M8: "gallery page loads" test removed here (covered by phase-a only — DRY).
 * M9: per-card individual test loop replaced with single for-loop test to
 *     reduce redundant goto calls.
 *
 * Route: /admin/dev/components (gallery page)
 * Auth: mock_session=admin cookie to pass admin route guard
 *
 * MOCK_MODE=true is set by playwright.config.ts webServer.env.
 */

import { test, expect } from '@playwright/test'
import { mockGoogleOAuth } from './_helpers/mock-oauth'

const GALLERY_URL = '/admin/dev/components'

/**
 * The 7 composite component catalog entry IDs.
 * These match the data-entry-id attributes set on ComponentCard elements
 * in the gallery (verified via components/composite/*.spec.ts).
 */
const COMPOSITE_ENTRY_IDS = [
  'modal',
  'drawer',
  'tooltip',
  'popover',
  'tabs',
  'form',
  'table',
] as const

test.describe('Template ISO — Component Library Phase B (7 composite components)', () => {
  test.beforeEach(async ({ page }) => {
    // Admin role needed for /admin/dev/components route.
    await mockGoogleOAuth(page, { email: 'admin@classlab.co.jp', role: 'admin' })
  })

  // M8: "gallery page loads" test is in phase-a only (DRY — single source of truth).

  // M9: single test with for-loop to visit gallery once and check all cards,
  // avoiding N redundant page.goto calls.
  test('all 7 composite component cards are present in gallery', async ({ page }) => {
    await page.goto(GALLERY_URL)
    await page.getByTestId('gallery-client').waitFor({ state: 'visible' })
    for (const entryId of COMPOSITE_ENTRY_IDS) {
      const card = page.locator(`[data-testid="component-card"][data-entry-id="${entryId}"]`)
      await card.scrollIntoViewIfNeeded()
      await expect(card, `component card for "${entryId}" must be visible`).toBeVisible()
    }
  })

  // Detailed interaction / keyboard / focus-trap assertions are covered by:
  //   apps/web/e2e/components/composite/*.spec.ts
  //   apps/web/e2e/composite/modal-focus-trap.spec.ts
  //   apps/web/e2e/composite/drawer-keyboard.spec.ts
  //   apps/web/e2e/composite/tabs-keyboard.spec.ts
  //   apps/web/e2e/composite/tooltip-esc.spec.ts
  //   apps/web/e2e/composite/form-validation.spec.ts
  //   apps/web/e2e/composite/data-table-interactive.spec.ts
  // No duplication here per DRY principle.
})
