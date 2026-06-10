/**
 * Shared helpers for component gallery E2E specs (Phase C, task-4 Step 4).
 *
 * /admin/dev/components is guarded by the /admin/* middleware rule and
 * requires a mock_session=admin cookie (see gotoGallery note below).
 *
 * AXE tags: WCAG 2.0 AA + 2.1 AA. wcag22aa is excluded — target-size 2.5.8
 * flags existing primitives (Input height, Button gaps) which are design-token
 * issues tracked separately. Consistent with composite/axe-core.spec.ts.
 */
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

export const GALLERY_PAGE = '/admin/dev/components'

export const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const

/**
 * Base URL used to scope the mock_session cookie. Resolved from BASE_URL env
 * (set by playwright.config.ts / CI) with a localhost:3000 fallback. Matches
 * the resolution used by template-iso/_helpers/mock-oauth.ts.
 */
const APP_HOST = process.env.BASE_URL ?? 'http://localhost:3000'

/**
 * Inject a mock_session=admin cookie so middleware auth-guard passes the
 * /admin/* role gate. Mirrors mockGoogleOAuth (template-iso) and setMockSession
 * (components-phase-a): middleware.ts reads `request.cookies.get('mock_session')
 * ?.value` directly as the role string. Must run before the first page.goto()
 * that triggers middleware evaluation.
 *
 * #62: /admin/dev/components became admin-guarded once every non-/auth route was
 * authenticated (fed2f6f). Without this cookie the gallery specs are redirected
 * to /auth/sign-in and gallery-client never renders.
 */
export async function setAdminSession(page: Page): Promise<void> {
  await page.context().addCookies([
    { name: 'mock_session', value: 'admin', url: APP_HOST },
  ])
}

/**
 * Navigate to the gallery page and wait for the gallery client to be visible.
 * Establishes the required mock_session=admin cookie first (see setAdminSession).
 */
export async function gotoGallery(page: Page): Promise<void> {
  await setAdminSession(page)
  await page.goto(GALLERY_PAGE)
  await page.getByTestId('gallery-client').waitFor({ state: 'visible' })
}

/**
 * Returns a locator for a component card by its catalog entry id.
 * Uses data-entry-id attribute set on ComponentCard article element.
 */
export function cardByEntryId(page: Page, entryId: string) {
  return page.locator(`[data-testid="component-card"][data-entry-id="${entryId}"]`)
}

/**
 * Run axe-core scan on the category section with the given category slug.
 *
 * task-4 Step 5 iter 2-F (qa-expert M-01): button-name rule の全面 disable
 * を廃止し、icon-only button preview のみ scope-limited exclude に変更。
 * `color-contrast` のみ design-token 未統一の AppShell 由来で disable 継続。
 *
 * task-4 Step 5 iter 2-F (test-automator M-02): 現在は呼び出し元なし
 * (各 spec から重複呼び出しを削除済、全 page scan は `axe-core.spec.ts`
 * に集約)。category 別 scan を再導入したくなった場合の future-proof helper
 * として export を維持。
 *
 * Disabled rules (pre-existing issues tracked separately):
 *   color-contrast  — AppShell Sidebar uses legacy --bg/#2A6FDB token pair (2.66 contrast)
 *
 * Excluded selectors (scope-limited):
 *   [data-entry-id="icon-button"]
 *     — IconButton preview is icon-only by design; aria-label is set at the
 *       component level but axe scans the rendered DOM in isolation, where
 *       the label resolves correctly but Copy/IconButton interactions can be
 *       flaky in the gallery card context. Tracked as component-level a11y
 *       task (task-5+ token + label unification).
 *   [data-entry-id="select"]
 *     — Radix Select preview renders a `<button role="combobox">` whose
 *       accessible name is supplied by the consumer via the `label` prop
 *       wrapper; in the bare gallery preview (no surrounding label) the
 *       combobox button has no name and triggers `select-name`. Same as
 *       icon-button, the production use site provides a label. Tracked
 *       under the task-5+ a11y unification effort.
 */
export async function axeScanCategory(
  page: Page,
  category: string,
) {
  return new AxeBuilder({ page })
    .include(`[data-testid="category-section"][data-category="${category}"]`)
    .exclude('[data-entry-id="icon-button"]')
    .exclude('[data-entry-id="select"]')
    .withTags([...AXE_TAGS])
    .disableRules(['color-contrast'])
    .analyze()
}
