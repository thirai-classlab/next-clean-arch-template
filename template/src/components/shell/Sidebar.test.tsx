/**
 * Sidebar tests — task-34 Step 2
 *
 * Updated to reflect the new PAGE_DEFS (2 groups, 3 routes):
 *   - 概要: Home (/)
 *   - 開発者ツール: Component 一覧 (/admin/dev/components), 管理画面 (/admin/dashboard)
 *
 * Removed: tests for Recall.ai 11-feature placeholder routes (/bots, /compliance etc.)
 * Removed: activeBots badge tests (useRecallStore removed from Sidebar)
 * Retained: nav landmark, link rendering, active state, search widget, keyboard a11y
 */
import * as React from 'react'
import { cleanup, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { renderWithChakra as render } from '@/test-utils'
import { Sidebar, PAGE_DEFS } from './Sidebar'

// Mockable usePathname — re-assigned per test via setPathname().
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

describe('Sidebar — public API', () => {
  it('exports PAGE_DEFS as a non-empty readonly array of groups', () => {
    expect(Array.isArray(PAGE_DEFS)).toBe(true)
    expect(PAGE_DEFS.length).toBeGreaterThan(0)
    for (const g of PAGE_DEFS) {
      expect(typeof g.group).toBe('string')
      expect(Array.isArray(g.items)).toBe(true)
      expect(g.items.length).toBeGreaterThan(0)
    }
  })

  it('includes the Home route in the 概要 group', () => {
    const allRoutes = PAGE_DEFS.flatMap((g) => g.items.map((i) => i.route))
    expect(allRoutes).toContain('/')
  })

  it('includes the new 開発者ツール routes', () => {
    const allRoutes = PAGE_DEFS.flatMap((g) => g.items.map((i) => i.route))
    expect(allRoutes).toContain('/admin/dev/components')
    expect(allRoutes).toContain('/admin/dashboard')
  })

  it('does NOT include legacy Recall.ai placeholder routes', () => {
    const allRoutes = PAGE_DEFS.flatMap((g) => g.items.map((i) => i.route))
    const legacyRoutes = [
      '/bots', '/transcription', '/realtime', '/breakout',
      '/media-output', '/recordings', '/webhooks', '/calendar',
      '/compliance', '/desktop-sdk', '/mobile-sdk',
    ]
    for (const route of legacyRoutes) {
      expect(allRoutes).not.toContain(route)
    }
  })

  it('has exactly 2 groups: 概要 and 開発者ツール', () => {
    expect(PAGE_DEFS.length).toBe(2)
    expect(PAGE_DEFS[0].group).toBe('概要')
    expect(PAGE_DEFS[1].group).toBe('開発者ツール')
  })
})

describe('Sidebar — render contract', () => {
  it('exposes a primary navigation landmark (<aside role="navigation">)', () => {
    const { getByRole } = render(<Sidebar />)
    const nav = getByRole('navigation', { name: /primary/i })
    expect(nav).toBeInTheDocument()
    expect(nav.tagName.toLowerCase()).toBe('aside')
  })

  it('renders every PAGE_DEFS route as a link', () => {
    const { getAllByRole } = render(<Sidebar />)
    const links = getAllByRole('link')
    const allRoutes = PAGE_DEFS.flatMap((g) => g.items.map((i) => i.route))
    for (const route of allRoutes) {
      expect(links.some((a) => a.getAttribute('href') === route)).toBe(true)
    }
  })

  it('renders a link for Component 一覧 (/admin/dev/components)', () => {
    const { getAllByRole } = render(<Sidebar />)
    const links = getAllByRole('link')
    expect(
      links.some((a) => a.getAttribute('href') === '/admin/dev/components'),
    ).toBe(true)
  })

  it('renders a link for 管理画面 (/admin/dashboard)', () => {
    const { getAllByRole } = render(<Sidebar />)
    const links = getAllByRole('link')
    expect(
      links.some((a) => a.getAttribute('href') === '/admin/dashboard'),
    ).toBe(true)
  })

  it('marks the active route with aria-current="page"', () => {
    setPathname('/admin/dashboard')
    const { getAllByRole } = render(<Sidebar />)
    const links = getAllByRole('link')
    const dashboardLink = links.find(
      (a) => a.getAttribute('href') === '/admin/dashboard',
    )
    expect(dashboardLink).toBeDefined()
    expect(dashboardLink).toHaveAttribute('aria-current', 'page')
    // Sibling routes should not be active.
    const homeLink = links.find((a) => a.getAttribute('href') === '/')
    expect(homeLink).not.toHaveAttribute('aria-current', 'page')
  })

  it('marks "/" as active via exact-match when pathname is "/"', () => {
    setPathname('/')
    const { getAllByRole } = render(<Sidebar />)
    const links = getAllByRole('link')
    const homeLink = links.find((a) => a.getAttribute('href') === '/')
    expect(homeLink).toBeDefined()
    expect(homeLink).toHaveAttribute('aria-current', 'page')
    // /admin/dashboard should NOT be active
    const dashboardLink = links.find(
      (a) => a.getAttribute('href') === '/admin/dashboard',
    )
    expect(dashboardLink).not.toHaveAttribute('aria-current', 'page')
  })

  it('marks /admin/dev/components as active when pathname matches exactly', () => {
    setPathname('/admin/dev/components')
    const { getAllByRole } = render(<Sidebar />)
    const links = getAllByRole('link')
    const componentsLink = links.find(
      (a) => a.getAttribute('href') === '/admin/dev/components',
    )
    expect(componentsLink).toHaveAttribute('aria-current', 'page')
  })

  it('does NOT mark Component 一覧 active when on a sub-route (exact-match only contract)', () => {
    // Deliberate design contract: Sidebar uses exact-match for aria-current.
    // If this test breaks after a change to prefix-match behaviour, the change
    // was intentional and this sentinel must be reviewed before merging.
    setPathname('/admin/dev/components/some-anchor')
    const { getAllByRole } = render(<Sidebar />)
    const links = getAllByRole('link')
    const componentsLink = links.find((a) => a.getAttribute('href') === '/admin/dev/components')
    expect(componentsLink).not.toHaveAttribute('aria-current', 'page')
  })

  it('renders group headings (h3) for each PAGE_DEFS group', () => {
    const { getAllByRole } = render(<Sidebar />)
    const headings = getAllByRole('heading', { level: 3 })
    expect(headings.length).toBeGreaterThanOrEqual(PAGE_DEFS.length)
  })

  it('does not throw with an unknown pathname', () => {
    setPathname('/some/unknown/path')
    expect(() => render(<Sidebar />)).not.toThrow()
  })
})

describe('Sidebar — render contract (DOM negative assertions)', () => {
  it('does NOT render links to legacy Recall.ai placeholder routes (DOM level)', () => {
    const { getAllByRole } = render(<Sidebar />)
    const links = getAllByRole('link')
    const hrefs = links.map((a) => a.getAttribute('href') ?? '')
    const legacyRoutes = [
      '/bots', '/transcription', '/realtime', '/breakout',
      '/media-output', '/recordings', '/webhooks', '/calendar',
      '/compliance', '/desktop-sdk', '/mobile-sdk',
    ]
    for (const route of legacyRoutes) {
      expect(hrefs).not.toContain(route)
    }
  })

  it('primary-nav testid is present on the aside landmark', () => {
    const { getByTestId } = render(<Sidebar />)
    const nav = getByTestId('primary-nav')
    expect(nav).toBeInTheDocument()
    expect(nav.tagName.toLowerCase()).toBe('aside')
  })
})

describe('Sidebar — search widget keyboard accessibility (R2-01)', () => {
  it('search widget is reachable by Tab (rendered as a button)', () => {
    const { getByRole } = render(<Sidebar onOpenPalette={vi.fn()} />)
    const btn = getByRole('button', { name: /open command palette/i })
    expect(btn).toBeInTheDocument()
  })

  it('search button responds to click event', () => {
    const onOpenPalette = vi.fn()
    const { getByRole } = render(<Sidebar onOpenPalette={onOpenPalette} />)
    const btn = getByRole('button', { name: /open command palette/i })
    fireEvent.click(btn)
    expect(onOpenPalette).toHaveBeenCalledOnce()
  })

  it('search button is reachable in tab order (jsdom does not synthesize Enter→click; covered by E2E)', () => {
    const onOpenPalette = vi.fn()
    const { getByRole } = render(<Sidebar onOpenPalette={onOpenPalette} />)
    const btn = getByRole('button', { name: /open command palette/i })
    expect(btn).toBeInTheDocument()
    // Confirm the button is a native focusable element (tabIndex === 0 by default for <button>)
    expect(btn.tabIndex).toBe(0)
  })

  it('has aria-label advertising the Cmd+K shortcut', () => {
    const { getByRole } = render(<Sidebar onOpenPalette={vi.fn()} />)
    const btn = getByRole('button', { name: /open command palette/i })
    expect(btn.getAttribute('aria-label')).toMatch(/cmd\+k/i)
  })

  it('renders without crashing when onOpenPalette is omitted (no-op default)', () => {
    expect(() => render(<Sidebar />)).not.toThrow()
  })
})
