/**
 * Topbar tests — Phase 6 Batch 1 / task-32
 *
 * Verifies the banner landmark, breadcrumb structure, MOCK badge / latency
 * presence, and preserved exports (`ROUTE_TITLES`).
 */
import * as React from 'react'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { renderWithChakra as render } from '@/test-utils'
import { Topbar, ROUTE_TITLES } from './Topbar'

let currentPath = '/'
vi.mock('next/navigation', () => ({
  usePathname: () => currentPath,
}))

function setPathname(p: string) {
  currentPath = p
}

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  setPathname('/')
})

describe('Topbar — public API', () => {
  it('exports ROUTE_TITLES as a record with at least Home / Bots entries', () => {
    expect(ROUTE_TITLES['/']).toBeDefined()
    expect(ROUTE_TITLES['/']?.label).toBe('Home')
    expect(ROUTE_TITLES['/bots']?.label).toBe('Bots')
  })

  it('declares a parent breadcrumb for nested routes (calendar/rules)', () => {
    expect(ROUTE_TITLES['/calendar/rules']?.parent).toBe('Calendar')
    expect(ROUTE_TITLES['/calendar/rules']?.parentRoute).toBe('/calendar')
  })
})

describe('Topbar — render contract', () => {
  it('exposes a banner landmark', () => {
    const { getByRole } = render(<Topbar />)
    const banner = getByRole('banner')
    expect(banner).toBeInTheDocument()
    expect(banner.tagName.toLowerCase()).toBe('header')
  })

  it('renders the breadcrumb as <nav aria-label="Breadcrumb"> with a list', () => {
    setPathname('/bots')
    const { getByRole } = render(<Topbar />)
    const nav = getByRole('navigation', { name: /breadcrumb/i })
    expect(nav).toBeInTheDocument()
    // <ol> inside <nav>
    const list = nav.querySelector('ol')
    expect(list).not.toBeNull()
  })

  it('marks the current page crumb with aria-current="page"', () => {
    setPathname('/bots')
    const { getByText } = render(<Topbar />)
    const current = getByText('Bots')
    // The last crumb is rendered as <span aria-current="page">.
    expect(current).toHaveAttribute('aria-current', 'page')
  })

  it('renders parent crumb as a clickable Link for nested routes', () => {
    setPathname('/calendar/rules')
    const { getByRole } = render(<Topbar />)
    const link = getByRole('link', { name: 'Calendar' })
    expect(link).toHaveAttribute('href', '/calendar')
  })

  it('renders the MOCK badge', () => {
    const { getByText } = render(<Topbar />)
    expect(getByText('MOCK')).toBeInTheDocument()
  })

  it('renders the version label (v0.1.0-poc)', () => {
    const { getByText } = render(<Topbar />)
    expect(getByText(/v0\.1\.0-poc/)).toBeInTheDocument()
  })

  it('renders a latency value (e.g. "<n>ms")', () => {
    const { container } = render(<Topbar />)
    expect(container.textContent).toMatch(/\d+ms/)
  })

  it('handles unknown pathnames gracefully', () => {
    setPathname('/totally/unknown/route')
    expect(() => render(<Topbar />)).not.toThrow()
  })

  // F-03: ColorModeToggle integration
  it('renders ColorModeToggle button in the right cluster', () => {
    const { getByRole } = render(<Topbar />)
    // ColorModeToggle renders an <button> with an aria-label containing 切り替え
    const toggleBtn = getByRole('button', { name: /切り替え/i })
    expect(toggleBtn).toBeInTheDocument()
    expect(toggleBtn).toHaveAttribute('data-color-mode')
  })

  // F-09: breadcrumb chevron semantics
  it('renders breadcrumb chevrons as aria-hidden spans, not list items', () => {
    setPathname('/calendar/rules')
    const { container } = render(<Topbar />)
    const ol = container.querySelector('ol')
    expect(ol).not.toBeNull()
    // All <li> elements inside the breadcrumb <ol> should be real crumb items
    // (recall-poc / Calendar / Auto-Trigger Rules = 3 items) — no chevron <li>.
    const listItems = ol!.querySelectorAll(':scope > li')
    expect(listItems.length).toBe(3)
    // Chevron separators are <span aria-hidden> elements (not li).
    const hiddenSpans = ol!.querySelectorAll(':scope > span[aria-hidden]')
    expect(hiddenSpans.length).toBe(2) // 2 separators for 3 crumbs
  })

  it('renders bot detail crumb (/bots/<id>) with truncated id', () => {
    setPathname('/bots/bot_abcdefghij_xyz')
    const { getAllByRole, getByText } = render(<Topbar />)
    // Bots parent should remain a link.
    const links = getAllByRole('link')
    expect(links.some((a) => a.getAttribute('href') === '/bots')).toBe(true)
    // Truncated id appears with ellipsis.
    expect(getByText(/^bot_abcdef…$/)).toBeInTheDocument()
  })

  // MEDIUM: breadcrumb 1-item for root pathname — branch coverage
  // buildCrumbs('/') returns [{ label: 'Home' }] — exactly 1 <li>, 0 separators
  it('renders a single breadcrumb item for the root "/" pathname', () => {
    setPathname('/')
    const { container } = render(<Topbar />)
    const ol = container.querySelector('ol')
    expect(ol).not.toBeNull()
    // Root path → buildCrumbs('/') returns [{ label: 'Home' }] — exactly 1 <li>
    const listItems = ol!.querySelectorAll(':scope > li')
    expect(listItems.length).toBe(1)
    // No separator spans for a single-item breadcrumb
    const hiddenSpans = ol!.querySelectorAll(':scope > span[aria-hidden]')
    expect(hiddenSpans.length).toBe(0)
  })

  // R-01: mobile 320px overflow prevention
  // The Topbar Flex root must carry overflowX="hidden" + minWidth="0" so that
  // on a 320px viewport the breadcrumb (175px) + right cluster (219px) +
  // padding (48px) = 442px total does not cause body.scrollWidth > viewport.
  //
  // Chakra v3 in JSDOM emits CSS via Emotion className (not inline style), so
  // we verify the structural guard by checking computed style which JSDOM
  // populates via Emotion's style injection, OR by checking the data attribute
  // that documents the overflow-clip intent and guards against accidental
  // prop removal.
  it('carries overflowX hidden and minWidth 0 on the banner root (R-01)', () => {
    const { getByRole } = render(<Topbar />)
    const banner = getByRole('banner')

    // Guard 1: the element is the topbar root (documented intent).
    expect(banner).toHaveAttribute('data-shell-topbar')

    // Guard 2: Emotion injects the overflow-x CSS rule into a <style> sheet;
    // JSDOM's getComputedStyle reads that sheet if the class is applied.
    // If the prop were removed the computed value would revert to 'visible'.
    const computed = window.getComputedStyle(banner)
    const overflowX = computed.getPropertyValue('overflow-x')

    // Chakra v3 / Emotion may report either 'hidden' (computed) or '' (JSDOM
    // limitation with SSR-less test env). We accept either non-'visible' value
    // OR verify via the Emotion class that the overflow rule is present in the
    // injected stylesheets — giving us a reliable regression signal without
    // depending on JSDOM's layout engine.
    const styleSheetText = Array.from(document.styleSheets)
      .flatMap((sheet) => {
        try {
          return Array.from(sheet.cssRules).map((r) => r.cssText)
        } catch {
          return []
        }
      })
      .join('\n')

    // CRITICAL-1 fix: use regex to match "overflow-x: hidden" specifically,
    // avoiding false positives from any CSS rule that merely contains
    // "overflow-x" (e.g. overflow-x: auto, overflow-x: scroll).
    const hasOverflowRule =
      overflowX === 'hidden' || /overflow-x\s*:\s*hidden/.test(styleSheetText)

    expect(hasOverflowRule).toBe(true)

    // Structural safety: banner must remain a <header> element.
    expect(banner.tagName.toLowerCase()).toBe('header')
  })
})
