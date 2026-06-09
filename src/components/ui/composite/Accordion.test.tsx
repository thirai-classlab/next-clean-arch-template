import * as React from 'react'
import { screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderWithChakra } from '@/test-utils'
import { Accordion } from './Accordion'

/**
 * Accordion unit tests — Chakra v3 (task-32 Batch 3a).
 *
 * Coverage:
 *  - content hidden on initial render (collapsed by default)
 *  - expands on trigger click; content revealed
 *  - collapses again on second click (single mode)
 *  - multiple mode: multiple items can be open simultaneously
 *  - onValueChange fires with the correct value array
 *  - disabled item: cannot be expanded
 *  - slot composition API (Accordion.Root / .Item / .Trigger / .Content)
 *  - defaultValue pre-opens the specified item
 *
 * Keyboard navigation (Arrow / Home / End) is delegated to Chakra/Ark and
 * covered by the Playwright E2E suite.
 */

afterEach(() => {
  cleanup()
})

const ITEMS = [
  {
    value: 'item-1',
    trigger: 'Section 1',
    content: <p>Content 1</p>,
  },
  {
    value: 'item-2',
    trigger: 'Section 2',
    content: <p>Content 2</p>,
  },
  {
    value: 'item-3',
    trigger: 'Section 3',
    content: <p>Content 3</p>,
    disabled: true,
  },
]

/** Click an accordion trigger and flush the Ark state machine.
 *
 * Ark Accordion resolves trigger actions from the focused element — we replicate
 * a real user click by focusing first, then dispatching the click event,
 * mirroring the pattern used in Tabs.test.tsx.
 */
async function clickTrigger(name: string) {
  await act(async () => {
    const btn = screen.getByRole('button', { name: new RegExp(name) })
    btn.focus()
    fireEvent.click(btn, { button: 0 })
    await new Promise((r) => setTimeout(r, 0))
  })
}

/**
 * Returns all accordion item elements.
 * Chakra v3 Accordion uses data-part="item" with data-state="open"|"closed"
 * on the item container — this is the most reliable open/close signal in jsdom.
 */
function getAllPanels(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll('[data-part="item"]')
  ) as HTMLElement[]
}

/** Returns true if Ark marks the item panel as open. */
function isPanelOpen(panelEl: HTMLElement): boolean {
  return panelEl.getAttribute('data-state') === 'open'
}

describe('Accordion (data-driven)', () => {
  describe('Test 1: collapsed on initial render', () => {
    it('does not show content before any trigger is clicked', () => {
      renderWithChakra(<Accordion items={ITEMS} />)
      // Chakra/Ark keeps panels mounted but hidden; data-state="closed"
      const panels = getAllPanels()
      panels.forEach((p) => {
        expect(isPanelOpen(p)).toBe(false)
      })
    })
  })

  describe('Test 2: expands on trigger click', () => {
    it('reveals content when the trigger is clicked', async () => {
      renderWithChakra(<Accordion items={ITEMS} />)
      await clickTrigger('Section 1')
      await waitFor(() => {
        const panels = getAllPanels()
        const openPanel = panels.find(isPanelOpen)
        expect(openPanel).not.toBeUndefined()
        expect(openPanel?.textContent).toContain('Content 1')
      }, { timeout: 2000 })
    })
  })

  describe('Test 3: single mode collapses on re-click', () => {
    it('closes the open item when its trigger is clicked again', async () => {
      renderWithChakra(<Accordion items={ITEMS} />)
      await clickTrigger('Section 1')
      await waitFor(() => {
        expect(getAllPanels().some(isPanelOpen)).toBe(true)
      }, { timeout: 2000 })
      await clickTrigger('Section 1')
      await waitFor(() => {
        expect(getAllPanels().some(isPanelOpen)).toBe(false)
      }, { timeout: 2000 })
    })
  })

  describe('Test 4: multiple mode', () => {
    it('allows more than one item to be open simultaneously', async () => {
      renderWithChakra(<Accordion items={ITEMS} multiple />)
      await clickTrigger('Section 1')
      await clickTrigger('Section 2')
      await waitFor(() => {
        const openPanels = getAllPanels().filter(isPanelOpen)
        expect(openPanels.length).toBeGreaterThanOrEqual(2)
      }, { timeout: 2000 })
    })
  })

  describe('Test 5: onValueChange callback', () => {
    it('fires onValueChange with the newly opened value', async () => {
      const handler = vi.fn()
      renderWithChakra(
        <Accordion items={ITEMS} onValueChange={handler} />
      )
      await clickTrigger('Section 1')
      await waitFor(() => {
        expect(handler).toHaveBeenCalled()
        const lastCall = handler.mock.calls[handler.mock.calls.length - 1][0] as string[]
        expect(lastCall).toContain('item-1')
      }, { timeout: 2000 })
    })
  })

  describe('Test 6: disabled item cannot be expanded', () => {
    it('does not open a disabled accordion item on click', async () => {
      renderWithChakra(<Accordion items={ITEMS} />)
      const disabledBtn = screen.getByRole('button', { name: /Section 3/ })
      expect(
        disabledBtn.hasAttribute('disabled') ||
        disabledBtn.getAttribute('data-disabled') !== null ||
        disabledBtn.getAttribute('aria-disabled') === 'true'
      ).toBe(true)
      await act(async () => {
        fireEvent.click(disabledBtn)
        await new Promise((r) => setTimeout(r, 0))
      })
      // All panels must still be closed.
      expect(getAllPanels().some(isPanelOpen)).toBe(false)
    })
  })

  describe('Test 7: defaultValue pre-opens items', () => {
    it('opens the item specified in defaultValue on initial render', async () => {
      renderWithChakra(<Accordion items={ITEMS} defaultValue={['item-2']} />)
      await waitFor(() => {
        const openPanels = getAllPanels().filter(isPanelOpen)
        expect(openPanels.length).toBeGreaterThan(0)
        expect(openPanels[0].textContent).toContain('Content 2')
      }, { timeout: 2000 })
    })
  })
})

describe('Accordion (slot composition)', () => {
  describe('Test 8: slot API expands on click', () => {
    it('renders and expands via slot composition API', async () => {
      renderWithChakra(
        <Accordion.Root>
          <Accordion.Item value="slot-1">
            <Accordion.Trigger>Slot Section</Accordion.Trigger>
            <Accordion.Content>Slot content body</Accordion.Content>
          </Accordion.Item>
        </Accordion.Root>
      )
      await clickTrigger('Slot Section')
      await waitFor(() => {
        const open = getAllPanels().find(isPanelOpen)
        expect(open?.textContent).toContain('Slot content body')
      }, { timeout: 2000 })
    })
  })
})
