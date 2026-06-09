import * as React from 'react'
import { screen, fireEvent, act, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderWithChakra } from '@/test-utils'
import { Tooltip } from './Tooltip'
import { Popover } from './Popover'

/**
 * Tooltip + Popover unit tests — Phase 3 (Chakra v3 Tooltip/Popover).
 *
 * Chakra/Ark drives open/close via interaction state machines and renders the
 * surface into a Portal. These tests assert the observable contract:
 *  - Tooltip: opens on hover (past its open delay), exposes role="tooltip",
 *    and wires aria-describedby on the trigger; a custom delay is honored.
 *  - Popover: opens on trigger click, renders role="dialog" (non-modal), and
 *    maps side + align to the resolved data-placement.
 *
 * jsdom cannot make a trigger `:focus-visible`, and Ark's hover open delay is
 * not deterministically advanceable via fake timers, so the keyboard
 * focus-reveal path, exact delay-window timing, and ESC / outside-click
 * dismissal + focus-return are covered by the Playwright E2E suite (the same
 * unit-vs-E2E split the Modal/Drawer focus-traversal tests use). Open
 * assertions therefore use real timers + waitFor.
 */

function hover(el: HTMLElement): void {
  fireEvent.pointerMove(el, { pointerType: 'mouse' })
  fireEvent.pointerEnter(el, { pointerType: 'mouse' })
}

describe('Tooltip + Popover', () => {
  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  describe('Test 1: Tooltip reveal on hover', () => {
    it('reveals content when the trigger is hovered', async () => {
      renderWithChakra(
        <Tooltip content="Help text">
          <button type="button">Trigger</button>
        </Tooltip>
      )

      const trigger = screen.getByRole('button', { name: 'Trigger' })
      act(() => hover(trigger))

      await waitFor(
        () => {
          expect(screen.queryAllByText('Help text').length).toBeGreaterThan(0)
        },
        { timeout: 2000 }
      )
    })
  })

  describe('Test 2: Tooltip closed before hover', () => {
    it('does not render the tooltip content until the trigger is hovered', () => {
      renderWithChakra(
        <Tooltip content="Delayed">
          <button type="button">Trigger</button>
        </Tooltip>
      )

      // No hover yet → tooltip surface is not mounted/visible.
      expect(screen.queryByText('Delayed')).toBeNull()
      expect(screen.queryByRole('tooltip')).toBeNull()
    })
  })

  describe('Test 3: Tooltip role + aria-describedby', () => {
    it('renders role="tooltip" and wires aria-describedby on the trigger', async () => {
      renderWithChakra(
        <Tooltip content="Described">
          <button type="button">DescTrigger</button>
        </Tooltip>
      )

      const trigger = screen.getByRole('button', { name: 'DescTrigger' })
      act(() => hover(trigger))

      const tooltipNode = await screen.findByRole('tooltip')
      expect(tooltipNode).not.toBeNull()

      const tooltipId = tooltipNode.getAttribute('id')
      expect(tooltipId).toBeTruthy()

      // Trigger references the tooltip content via aria-describedby.
      await waitFor(
        () => {
          expect(trigger.getAttribute('aria-describedby')).toBe(tooltipId)
        },
        { timeout: 2000 }
      )
    })
  })

  describe('Test 4: Tooltip custom delay', () => {
    it('opens on hover when a custom delay is provided', async () => {
      renderWithChakra(
        <Tooltip content="Fast" delay={100}>
          <button type="button">FastTrigger</button>
        </Tooltip>
      )

      const trigger = screen.getByRole('button', { name: 'FastTrigger' })

      // Closed immediately on render (before hover).
      expect(screen.queryByText('Fast')).toBeNull()

      act(() => hover(trigger))

      await waitFor(
        () => {
          expect(screen.queryAllByText('Fast').length).toBeGreaterThan(0)
        },
        { timeout: 2000 }
      )
    })
  })

  describe('Test 5: Tooltip side prop', () => {
    it('accepts a side prop and still opens on hover', async () => {
      renderWithChakra(
        <Tooltip content="SideTip" side="bottom">
          <button type="button">SideTrigger</button>
        </Tooltip>
      )

      const trigger = screen.getByRole('button', { name: 'SideTrigger' })
      act(() => hover(trigger))

      await waitFor(
        () => {
          expect(screen.queryAllByText('SideTip').length).toBeGreaterThan(0)
        },
        { timeout: 2000 }
      )
    })
  })

  describe('Test 6: Popover opens on click', () => {
    it('renders content inside a non-modal dialog when the trigger is clicked', async () => {
      renderWithChakra(
        <Popover
          trigger={<button type="button">Open</button>}
          content={<div>Popover body</div>}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: 'Open' }))

      await waitFor(
        () => {
          expect(screen.queryAllByText('Popover body').length).toBeGreaterThan(0)
        },
        { timeout: 2000 }
      )

      // Non-modal dialog: role="dialog" present, but not aria-modal="true".
      const dialog = document.querySelector('[role="dialog"]')
      expect(dialog).not.toBeNull()
      expect(dialog?.getAttribute('aria-modal')).not.toBe('true')
    })
  })

  describe('Test 7: Popover side + align positioning', () => {
    it('maps side + align to the resolved data-placement', async () => {
      renderWithChakra(
        <Popover
          trigger={<button type="button">PosTrigger</button>}
          content={<div>Positioned</div>}
          side="right"
          align="end"
        />
      )

      fireEvent.click(screen.getByRole('button', { name: 'PosTrigger' }))

      await waitFor(
        () => {
          expect(screen.queryAllByText('Positioned').length).toBeGreaterThan(0)
        },
        { timeout: 2000 }
      )

      // Ark Popover.Positioner exposes data-placement as a public attribute on the
      // positioner host element. We query it via document to avoid coupling to the
      // exact DOM depth between the text node and the positioner.
      await waitFor(
        () => {
          const placementHost = document.querySelector('[data-placement]') as HTMLElement | null
          expect(placementHost).not.toBeNull()
          expect(placementHost?.getAttribute('data-placement')).toBe('right-end')
        },
        { timeout: 2000 }
      )
    })
  })
})
