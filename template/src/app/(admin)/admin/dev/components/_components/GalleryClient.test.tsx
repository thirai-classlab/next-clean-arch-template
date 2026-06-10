// Smoke test for the GalleryClient — verifies it can mount with the real
// catalog and renders the expected category / card scaffolding.
//
// Heavy interactions (Toast trigger, Modal open) are exercised by the
// Step 4 Playwright suite; this test deliberately stays on the unit side.
//
// task-34 R2-F4:
//   - Hardcoded counts replaced with CATALOG_SUMMARY references (HIGH-5)
//   - FilterBar test replaced with "no FilterBar" assertion (UI removed in R2-F4)
//   - scroll-spy unit tests added (M-B + M-D)

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { screen, act } from '@testing-library/react'

// The gallery now mounts the task-5 admin client islands (AllowListManager uses
// useRouter; UsersTable uses next/link) and the task-32 shell components
// (Sidebar / Topbar use usePathname). None of those App Router contexts are
// mounted in jsdom, so we mock next/navigation here. At runtime the real App
// Router provides these — this mock only unblocks the unit-level smoke test.
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/dev/components',
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))
// GalleryClient renders Chakra v3 primitives, which read the design-token
// system from React context — render via the shared ChakraProvider wrapper.
import { renderWithChakra as render } from '@/test-utils'
import { renderHook } from '@testing-library/react'
import { GalleryClient, useActiveCategoryScrollSpy } from './GalleryClient'
import { COMPONENT_CATALOG, CATALOG_SUMMARY, type ComponentCategory } from '../_data/component-catalog'

describe('GalleryClient', () => {
  it('mounts and renders the gallery shell', () => {
    render(<GalleryClient />)
    expect(screen.getByTestId('gallery-client')).toBeInTheDocument()
  })

  it('renders one section per non-empty category', () => {
    render(<GalleryClient />)
    const sections = screen.getAllByTestId('category-section')
    // 7 categories all have at least one entry, so all 7 sections render.
    expect(sections).toHaveLength(7)
  })

  it('renders component cards total matching COMPONENT_CATALOG length', () => {
    render(<GalleryClient />)
    const cards = screen.getAllByTestId('component-card')
    expect(cards).toHaveLength(COMPONENT_CATALOG.length)
  })

  it('does not render the legacy FilterBar radio group', () => {
    render(<GalleryClient />)
    // FilterBar was removed in R2-F4 (HIGH-7 dedup fix).
    // gallery-filter testid must no longer exist.
    expect(screen.queryByTestId('gallery-filter')).not.toBeInTheDocument()
  })

  it('marks placeholder cards with the 🚧 status badge', () => {
    render(<GalleryClient />)
    const cards = screen.getAllByTestId('component-card')
    const placeholders = cards.filter(
      (card) => card.getAttribute('data-status') === 'placeholder',
    )
    // Use CATALOG_SUMMARY so the assertion stays in sync with the catalog SSoT (HIGH-5)
    expect(placeholders).toHaveLength(CATALOG_SUMMARY.placeholder)
  })

  it('marks implemented cards with the ✅ status badge', () => {
    render(<GalleryClient />)
    const cards = screen.getAllByTestId('component-card')
    const implemented = cards.filter(
      (card) => card.getAttribute('data-status') === 'implemented',
    )
    // Use CATALOG_SUMMARY so the assertion stays in sync with the catalog SSoT (HIGH-5)
    expect(implemented).toHaveLength(CATALOG_SUMMARY.implemented)
  })
})

// ─── useActiveCategoryScrollSpy ──────────────────────────────────────────────

describe('useActiveCategoryScrollSpy', () => {
  it('returns null when IntersectionObserver is unavailable (fallback path)', () => {
    // test-setup.ts now polyfills IntersectionObserver globally (required by Chakra
    // v3 @zag-js/carousel). To exercise the hook's IO-absent fallback, locally remove
    // the global for the duration of this test and restore it afterwards.
    const savedGlobal = global.IntersectionObserver
    const savedWindow =
      typeof window !== 'undefined' ? window.IntersectionObserver : undefined
    // @ts-expect-error — intentionally clearing the polyfill to simulate jsdom default
    delete global.IntersectionObserver
    if (typeof window !== 'undefined') {
      // @ts-expect-error — same, on the window surface the hook reads
      delete window.IntersectionObserver
    }
    try {
      expect(typeof IntersectionObserver).toBe('undefined')
      const { result } = renderHook(() => useActiveCategoryScrollSpy('all'))
      expect(result.current).toBeNull()
    } finally {
      global.IntersectionObserver = savedGlobal
      if (typeof window !== 'undefined' && savedWindow) {
        window.IntersectionObserver = savedWindow
      }
    }
  })

  describe('with mocked IntersectionObserver and section elements', () => {
    // Minimal IntersectionObserver mock — records instances so we can verify
    // the observer is reconstructed when the `filter` arg changes.
    type MockCallback = (entries: IntersectionObserverEntry[]) => void

    interface MockInstance {
      callback: MockCallback
      observe: ReturnType<typeof vi.fn>
      disconnect: ReturnType<typeof vi.fn>
    }

    let observerInstances: MockInstance[]
    let sectionEls: HTMLElement[]

    beforeEach(() => {
      observerInstances = []

      // Seed real DOM elements so sectionEls.length > 0 inside the hook.
      sectionEls = ['typography', 'primitive'].map((cat) => {
        const el = document.createElement('section')
        el.id = `category-section-${cat}`
        document.body.appendChild(el)
        return el
      })

      vi.stubGlobal(
        'IntersectionObserver',
        vi.fn().mockImplementation(function (this: unknown, cb: MockCallback) {
          const instance: MockInstance = {
            callback: cb,
            observe: vi.fn(),
            disconnect: vi.fn(),
          }
          observerInstances.push(instance)
          return instance
        }),
      )
    })

    afterEach(() => {
      vi.unstubAllGlobals()
      for (const el of sectionEls) {
        if (el.parentNode) {
          el.parentNode.removeChild(el)
        }
      }
    })

    it('rebuilds observer when filter changes', () => {
      // Start with filter='all'
      type FilterProp = { filter: 'all' | 'typography' }
      const initialFilterProps: FilterProp = { filter: 'all' }
      const { rerender } = renderHook<ComponentCategory | null, FilterProp>(
        ({ filter }) => useActiveCategoryScrollSpy(filter),
        { initialProps: initialFilterProps },
      )

      // One observer created on initial render
      expect(observerInstances).toHaveLength(1)
      const firstDisconnect = observerInstances[0]?.disconnect

      // Change filter → effect deps fire → old observer disconnected, new one created
      act(() => {
        rerender({ filter: 'typography' as const })
      })

      // Old observer must be disconnected (cleanup ran)
      expect(firstDisconnect).toHaveBeenCalledOnce()
      // New observer was created
      expect(observerInstances).toHaveLength(2)
    })
  })

  describe('handleSelectCategory resets filter to ALL', () => {
    it('handleSelectCategory resets filter to ALL (DOM-level verify)', () => {
      // FilterBar was removed in R2-F4, so filter state is internal to GalleryClient.
      // We verify that clicking a CategoryNav tab does NOT hide any category sections,
      // confirming the filter stays at ALL_FILTER_VALUE after navigation.
      render(<GalleryClient />)

      // Initial render: all 7 category sections are visible (filter='all')
      const sectionsBefore = screen.getAllByTestId('category-section')
      expect(sectionsBefore).toHaveLength(7)

      // Click a CategoryNav tab (domain category)
      const domainTab = screen.getByTestId('category-nav-tab-domain')
      domainTab.click()

      // filter='all' is maintained, so all 7 sections remain visible
      const sectionsAfter = screen.getAllByTestId('category-section')
      expect(sectionsAfter).toHaveLength(7)
    })

    it('scrolls to the target section when a CategoryNav tab is clicked', async () => {
      // Create a DOM element that handleSelectCategory will look up.
      const sectionEl = document.createElement('div')
      sectionEl.id = 'category-section-typography'
      document.body.appendChild(sectionEl)

      const scrollIntoViewMock = vi.fn()
      sectionEl.scrollIntoView = scrollIntoViewMock

      // Render the full GalleryClient (filter state is internal).
      render(<GalleryClient />)

      // CategoryNav tabs carry role="tab" (not "button") — query by testid.
      const tab = screen.getByTestId('category-nav-tab-typography')
      await act(async () => {
        tab.click()
      })

      // scrollIntoView should have been called via requestAnimationFrame.
      // Wait one rAF tick.
      await act(async () => {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      })

      expect(scrollIntoViewMock).toHaveBeenCalledWith(
        expect.objectContaining({ behavior: 'smooth', block: 'start' }),
      )

      document.body.removeChild(sectionEl)
    })
  })
})
