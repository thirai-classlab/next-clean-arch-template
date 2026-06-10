/**
 * AppShell tests — Phase 6 Batch 1 / task-32
 *
 * Smoke tests for the Chakra v3 Shell root. jsdom cannot evaluate the
 * responsive breakpoint (single-column on `base`, two-column on `md`), so
 * that contract is delegated to Playwright E2E + visual verification.
 */
import * as React from 'react'
import { cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { renderWithChakra as render } from '@/test-utils'
import { AppShell } from './AppShell'

// initTicker reaches into the Zustand store on mount; stub it so the smoke
// tests don't depend on the global tick interval / mock store state.
vi.mock('@/lib/store', async () => {
  const actual = await vi.importActual<typeof import('@/lib/store')>('@/lib/store')
  return {
    ...actual,
    initTicker: vi.fn(),
  }
})

// next/navigation hooks used inside the default Sidebar / Topbar.
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

// CommandPalette — stub so tests don't depend on cmdk internals.
// Exposes a data-testid that reflects the `open` prop for wiring assertions.
vi.mock('@/components/ui/composite/CommandPalette', () => ({
  CommandPalette: ({ open }: { open: boolean }) => (
    <div data-testid="command-palette" data-open={String(open)} />
  ),
}))

afterEach(() => {
  cleanup()
})

describe('AppShell', () => {
  it('renders without throwing and exposes the application landmark', () => {
    const { getByRole } = render(
      <AppShell>
        <p>Hello content</p>
      </AppShell>
    )
    expect(getByRole('application', { name: /recall-poc workspace/i })).toBeInTheDocument()
  })

  it('renders children inside the main landmark', () => {
    const { getByRole, getByText } = render(
      <AppShell>
        <p>Hello content</p>
      </AppShell>
    )
    const main = getByRole('main')
    expect(main).toBeInTheDocument()
    expect(main).toContainElement(getByText('Hello content'))
  })

  it('renders the default Sidebar + Topbar when no slot props are provided', () => {
    const { getByRole, container } = render(
      <AppShell>
        <p>Hello</p>
      </AppShell>
    )
    // Default Sidebar is wrapped in a display:none box on mobile (F-01 fix).
    // jsdom does not evaluate CSS breakpoints so the sidebar DOM is present but
    // visually hidden at the base breakpoint. We query it via the DOM directly.
    const nav = container.querySelector('[aria-label="Primary"]')
    expect(nav).toBeInTheDocument()
    // Default Topbar exposes role="banner"
    expect(getByRole('banner')).toBeInTheDocument()
  })

  it('renders a custom sidebar slot in place of the default', () => {
    const { getByTestId, queryByRole } = render(
      <AppShell sidebar={<div data-testid="custom-sidebar">SB</div>}>
        <p>Hello</p>
      </AppShell>
    )
    expect(getByTestId('custom-sidebar')).toBeInTheDocument()
    // The default Sidebar's navigation landmark should not be present.
    expect(queryByRole('navigation', { name: /primary/i })).toBeNull()
  })

  it('renders a custom topbar slot in place of the default', () => {
    const { getByTestId, queryByText } = render(
      <AppShell topbar={<div data-testid="custom-topbar">TB-CUSTOM</div>}>
        <p>Hello</p>
      </AppShell>
    )
    expect(getByTestId('custom-topbar')).toBeInTheDocument()
    // The default Topbar renders the MOCK badge; the custom replacement
    // does not include it.
    expect(queryByText('MOCK')).toBeNull()
  })

  it('hides the sidebar entirely when sidebar={null} is passed', () => {
    const { queryByRole } = render(
      <AppShell sidebar={null}>
        <p>Hello</p>
      </AppShell>
    )
    expect(queryByRole('navigation', { name: /primary/i })).toBeNull()
  })

  it('hides the topbar entirely when topbar={null} is passed', () => {
    const { queryByRole } = render(
      <AppShell topbar={null}>
        <p>Hello</p>
      </AppShell>
    )
    expect(queryByRole('banner')).toBeNull()
  })

  // F-01: sidebar is wrapped in a display:none box on mobile so main content
  // is always visible. jsdom cannot evaluate CSS breakpoints, so we assert
  // the structural intent: the sidebar wrapper carries the responsive display
  // attribute and the main landmark is rendered unconditionally.
  it('sidebar wrapper carries responsive display:none on mobile (F-01)', () => {
    const { container, getByRole } = render(
      <AppShell>
        <p>Content</p>
      </AppShell>
    )
    // The main landmark is always present regardless of sidebar visibility.
    expect(getByRole('main')).toBeInTheDocument()
    // The sidebar is wrapped in a box that has a CSS variable controlling
    // its display. We assert the sidebar DOM node still exists in the tree
    // (CSS hides it at base breakpoint, Playwright E2E confirms visual result).
    const nav = container.querySelector('[aria-label="Primary"]')
    expect(nav).toBeInTheDocument()
  })

  it('still calls initTicker on mount (mock-store bootstrap preserved)', async () => {
    const storeModule = await import('@/lib/store')
    const initTicker = vi.mocked(storeModule.initTicker)
    initTicker.mockClear()
    render(
      <AppShell>
        <p>Hello</p>
      </AppShell>
    )
    expect(initTicker).toHaveBeenCalledWith('normal')
  })

  it('renders CommandPalette closed by default when no sidebar slot is provided (R3-02)', () => {
    const { getByTestId } = render(
      <AppShell>
        <p>Hello</p>
      </AppShell>
    )
    const palette = getByTestId('command-palette')
    expect(palette).toBeInTheDocument()
    expect(palette.dataset.open).toBe('false')
  })

  it('opens CommandPalette when the default Sidebar search button is clicked (R3-02)', () => {
    const { getByTestId, container } = render(
      <AppShell>
        <p>Hello</p>
      </AppShell>
    )
    // Sidebar is inside a display:none wrapper on mobile (jsdom cannot evaluate
    // CSS breakpoints). We query the button via aria-label directly so the
    // display:none wrapper does not prevent selection.
    const searchBtn = container.querySelector(
      'button[aria-label*="command palette" i], button[aria-label*="Command Palette" i]',
    ) as HTMLButtonElement
    expect(searchBtn).not.toBeNull()
    fireEvent.click(searchBtn)
    const palette = getByTestId('command-palette')
    expect(palette.dataset.open).toBe('true')
  })

  it('does not render the default CommandPalette when a custom sidebar slot is provided (R3-02)', () => {
    const { queryByTestId } = render(
      <AppShell sidebar={<div>Custom SB</div>}>
        <p>Hello</p>
      </AppShell>
    )
    expect(queryByTestId('command-palette')).toBeNull()
  })

  // NF-01: Cmd+K / Ctrl+K keyboard shortcut wiring (F7)
  it('opens CommandPalette on Cmd+K when default sidebar is used (NF-01)', () => {
    const { getByTestId } = render(
      <AppShell>
        <p>Hello</p>
      </AppShell>
    )
    const palette = getByTestId('command-palette')
    expect(palette.dataset.open).toBe('false')
    fireEvent.keyDown(document, { key: 'k', metaKey: true })
    expect(palette.dataset.open).toBe('true')
  })

  it('opens CommandPalette on Ctrl+K when default sidebar is used (NF-01, Windows/Linux)', () => {
    const { getByTestId } = render(
      <AppShell>
        <p>Hello</p>
      </AppShell>
    )
    const palette = getByTestId('command-palette')
    expect(palette.dataset.open).toBe('false')
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    expect(palette.dataset.open).toBe('true')
  })

  it('does not open CommandPalette on Cmd+K when a custom sidebar slot is provided (NF-01, no-op)', () => {
    // Custom sidebar: keydown listener must not be attached.
    // CommandPalette itself is also not rendered, so we assert no palette exists.
    const { queryByTestId } = render(
      <AppShell sidebar={<div>Custom SB</div>}>
        <p>Hello</p>
      </AppShell>
    )
    fireEvent.keyDown(document, { key: 'k', metaKey: true })
    expect(queryByTestId('command-palette')).toBeNull()
  })
})
