/**
 * apps/web/e2e/template-iso/components-phase-a.spec.ts
 *
 * Task-7 Step 2 — Template Isolated Test: Component Library Phase A smoke
 * H-03 decision: split into 3 files (phase-a / phase-b / phase-c).
 *
 * Phase A scope (task-2 complete):
 *   Typography × 4 (Heading / Text / Code / Link)
 *   Primitive × 8 (Button / IconButton / Input / Textarea / Select /
 *                  Checkbox / RadioGroup / Switch)
 *   Total: 12 component sections (4 typography + 8 primitive)
 *
 * DRY strategy:
 *   Detailed per-component specs already exist in:
 *     apps/web/e2e/components-phase-a/typography.spec.ts  (Heading/Text/Code/Link)
 *     apps/web/e2e/components-phase-a/primitive.spec.ts   (Button–Switch)
 *     apps/web/e2e/components-phase-a/smoke.spec.ts       (page-level smoke)
 *   This template-iso spec provides a thin integration smoke that verifies
 *   the component gallery route is reachable and all 16 section testids are
 *   present — without duplicating the detailed per-variant assertions.
 *
 * Route: /admin/dev/components (gallery page)
 * Auth: mock_session=admin cookie to pass /admin/* route guard
 *
 * NOTE: components-phase-a/smoke.spec.ts navigates to /dev/components using
 * role='user'. Both /dev/components and /admin/dev/components require admin
 * role (middleware Rule 2). This template-iso spec uses admin cookie +
 * /admin/dev/components which matches how phase-b/c specs and e2e/components/
 * specs access the gallery.
 *
 * MOCK_MODE=true is set by playwright.config.ts webServer.env.
 */

import { test, expect } from '@playwright/test'
import { mockGoogleOAuth } from './_helpers/mock-oauth'

const GALLERY_URL = '/admin/dev/components'

/**
 * Typography component catalog entry IDs in the gallery (task-2 Phase A).
 * These match data-entry-id attributes on ComponentCard elements at
 * /admin/dev/components (verified from component-catalog.ts).
 */
const TYPOGRAPHY_ENTRY_IDS = [
  'heading',
  'text',
  'code',
  'link',
] as const

/**
 * Primitive component catalog entry IDs in the gallery (task-2 Phase A).
 * Verified from component-catalog.ts.
 */
const PRIMITIVE_ENTRY_IDS = [
  'button',
  'icon-button',
  'input',
  'textarea',
  'select',
  'checkbox',
  'radio',
  'switch',
] as const

test.describe('Template ISO — Component Library Phase A (12 sections)', () => {
  test.beforeEach(async ({ page }) => {
    // Admin role required: /admin/dev/components is protected by admin middleware guard.
    // Only mock_session=admin passes the /admin/* guard.
    await mockGoogleOAuth(page, { email: 'admin@classlab.co.jp', role: 'admin' })
  })

  test('gallery page loads (route /admin/dev/components is reachable)', async ({ page }) => {
    await page.goto(GALLERY_URL)
    // Page renders without being redirected to /auth/sign-in or /dashboard.
    await expect(page).not.toHaveURL(/auth\/sign-in/)
    await expect(page).not.toHaveURL(/^http:\/\/localhost:3000\/dashboard$/)
    // gallery-client is the root testid for the ComponentGallery client component.
    // (components-page testid is on the /dev/components legacy page, not the gallery.)
    await expect(page.getByTestId('gallery-client')).toBeVisible()
  })

  test('all 4 typography component cards are present in gallery', async ({ page }) => {
    await page.goto(GALLERY_URL)
    await page.getByTestId('gallery-client').waitFor({ state: 'visible' })
    for (const entryId of TYPOGRAPHY_ENTRY_IDS) {
      const card = page.locator(`[data-testid="component-card"][data-entry-id="${entryId}"]`)
      await card.scrollIntoViewIfNeeded()
      await expect(card, `component card for "${entryId}" must be visible`).toBeVisible()
    }
  })

  // 4 typography + 8 primitive = 12 phase-a sections
  test('all 8 primitive component cards are present in gallery', async ({ page }) => {
    await page.goto(GALLERY_URL)
    await page.getByTestId('gallery-client').waitFor({ state: 'visible' })
    for (const entryId of PRIMITIVE_ENTRY_IDS) {
      const card = page.locator(`[data-testid="component-card"][data-entry-id="${entryId}"]`)
      await card.scrollIntoViewIfNeeded()
      await expect(card, `component card for "${entryId}" must be visible`).toBeVisible()
    }
  })

  test('phase-a component card previews are not placeholder stubs', async ({ page }) => {
    // M6: verify that all phase-a (implemented) cards do not show placeholder text
    // in their [data-testid="component-card-preview"] section.
    await page.goto(GALLERY_URL)
    await page.getByTestId('gallery-client').waitFor({ state: 'visible' })
    const allEntryIds = [...TYPOGRAPHY_ENTRY_IDS, ...PRIMITIVE_ENTRY_IDS]
    for (const entryId of allEntryIds) {
      const preview = page.locator(
        `[data-testid="component-card"][data-entry-id="${entryId}"] [data-testid="component-card-preview"]`,
      )
      await preview.scrollIntoViewIfNeeded()
      // Placeholder stubs contain Japanese placeholder markers set in ComponentCard.tsx
      await expect(preview, `preview for "${entryId}" should not show placeholder stub`).not.toContainText(
        '未実装',
      )
    }
  })

  // Detailed per-variant assertions are covered by:
  //   apps/web/e2e/components-phase-a/typography.spec.ts  (Heading/Text/Code/Link, /dev/components)
  //   apps/web/e2e/components-phase-a/primitive.spec.ts   (Button–Switch, /dev/components)
  //   apps/web/e2e/components-phase-a/smoke.spec.ts       (page-level smoke, /dev/components)
  // NOTE: those specs use /dev/components. This template-iso spec uses
  // /admin/dev/components + admin cookie. No duplication here per DRY principle.
})
