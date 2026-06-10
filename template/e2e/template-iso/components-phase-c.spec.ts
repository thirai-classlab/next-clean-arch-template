/**
 * apps/web/e2e/template-iso/components-phase-c.spec.ts
 *
 * Task-7 Step 2 — Template Isolated Test: Component Library Phase C smoke
 * H-03 decision: split into 3 files (phase-a / phase-b / phase-c).
 *
 * Phase C scope (task-4 complete):
 *   Feedback × 6: Alert / EmptyState / ErrorBoundary / Skeleton / Spinner / Toast
 *   Layout × 5:  Container / Grid / Inline / Spacer / Stack
 *   Domain × 3:  BotStatusBadge / RecallEventCard / TranscriptBubble
 *   Total: 14 component groups
 *
 * M5: feedback count corrected to 6 (was "feedback 5" in prior version; Toast included).
 * M8: "gallery page loads" test removed here (covered by phase-a only — DRY).
 * M9: per-card individual test loops replaced with single for-loop tests per group
 *     to reduce redundant page.goto calls.
 *
 * DRY strategy:
 *   Detailed per-component specs already exist in:
 *     apps/web/e2e/components/feedback/*.spec.ts   (6 feedback specs)
 *     apps/web/e2e/components/layout/*.spec.ts     (5 layout specs)
 *     apps/web/e2e/components/domain/*.spec.ts     (3 domain specs)
 *   This template-iso spec provides a thin integration smoke that verifies
 *   all Phase C component cards are rendered in the gallery without
 *   duplicating per-variant assertions.
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
 * Phase C catalog entry IDs (feedback + layout + domain).
 * These match data-entry-id attributes on ComponentCard elements.
 * Verified against apps/web/e2e/components/{feedback,layout,domain}/*.spec.ts.
 */
const FEEDBACK_ENTRY_IDS = [
  'alert',
  'empty-state',
  'error-boundary',
  'skeleton',
  'spinner',
  'toast',
] as const

const LAYOUT_ENTRY_IDS = [
  'container',
  'grid',
  'inline',
  'spacer',
  'stack',
] as const

const DOMAIN_ENTRY_IDS = [
  'bot-status-badge',
  'recall-event-card',
  'transcript-bubble',
] as const

test.describe('Template ISO — Component Library Phase C (feedback 6 + layout 5 + domain 3)', () => {
  test.beforeEach(async ({ page }) => {
    // Admin role needed for /admin/dev/components route.
    await mockGoogleOAuth(page, { email: 'admin@classlab.co.jp', role: 'admin' })
  })

  // M8: "gallery page loads" test is in phase-a only (DRY — single source of truth).

  // M9: single test per group with for-loop to visit gallery once and check all cards.
  test('all 6 feedback component cards are present in gallery', async ({ page }) => {
    await page.goto(GALLERY_URL)
    await page.getByTestId('gallery-client').waitFor({ state: 'visible' })
    for (const entryId of FEEDBACK_ENTRY_IDS) {
      const card = page.locator(`[data-testid="component-card"][data-entry-id="${entryId}"]`)
      await card.scrollIntoViewIfNeeded()
      await expect(card, `feedback card for "${entryId}" must be visible`).toBeVisible()
    }
  })

  test('all 5 layout component cards are present in gallery', async ({ page }) => {
    await page.goto(GALLERY_URL)
    await page.getByTestId('gallery-client').waitFor({ state: 'visible' })
    for (const entryId of LAYOUT_ENTRY_IDS) {
      const card = page.locator(`[data-testid="component-card"][data-entry-id="${entryId}"]`)
      await card.scrollIntoViewIfNeeded()
      await expect(card, `layout card for "${entryId}" must be visible`).toBeVisible()
    }
  })

  test('all 3 domain component cards are present in gallery', async ({ page }) => {
    await page.goto(GALLERY_URL)
    await page.getByTestId('gallery-client').waitFor({ state: 'visible' })
    for (const entryId of DOMAIN_ENTRY_IDS) {
      const card = page.locator(`[data-testid="component-card"][data-entry-id="${entryId}"]`)
      await card.scrollIntoViewIfNeeded()
      await expect(card, `domain card for "${entryId}" must be visible`).toBeVisible()
    }
  })

  // Detailed assertions are covered by:
  //   apps/web/e2e/components/feedback/*.spec.ts
  //   apps/web/e2e/components/layout/*.spec.ts
  //   apps/web/e2e/components/domain/*.spec.ts
  //   apps/web/e2e/components/axe-core.spec.ts   (full gallery axe scan)
  // No duplication here per DRY principle.
})
