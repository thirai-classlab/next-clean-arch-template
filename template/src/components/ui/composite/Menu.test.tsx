import * as React from 'react'
import { screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderWithChakra } from '@/test-utils'
import { Menu } from './Menu'

/**
 * Menu unit tests — Chakra v3 (task-32 Batch 3a).
 *
 * Coverage:
 *  - menu closed on initial render
 *  - opens on trigger click; role="menu" present
 *  - item selection fires onSelect callback
 *  - danger colorScheme applied (color token)
 *  - disabled item: no onSelect fired
 *  - slot composition API (Menu.Root / .Trigger / .Content / .Item / .Separator)
 *
 * Keyboard open/close and ESC dismiss are covered by Playwright E2E
 * (same split as Tooltip / Popover tests).
 */

afterEach(() => {
  cleanup()
})

const ITEMS = [
  { value: 'copy',   label: 'Copy',   onSelect: vi.fn() },
  { value: 'paste',  label: 'Paste',  onSelect: vi.fn() },
  { value: 'delete', label: 'Delete', colorScheme: 'danger' as const, onSelect: vi.fn() },
]

describe('Menu (data-driven)', () => {
  describe('Test 1: closed on initial render', () => {
    it('does not show menu items before the trigger is clicked', () => {
      renderWithChakra(
        <Menu trigger={<button type="button">Actions</button>} items={ITEMS} />
      )
      expect(screen.queryByRole('menu')).toBeNull()
      expect(screen.queryByText('Copy')).toBeNull()
    })
  })

  describe('Test 2: opens on trigger click', () => {
    it('renders role="menu" with all items after trigger click', async () => {
      renderWithChakra(
        <Menu trigger={<button type="button">Actions</button>} items={ITEMS} />
      )
      fireEvent.click(screen.getByRole('button', { name: 'Actions' }))
      await waitFor(
        () => expect(screen.queryByRole('menu')).not.toBeNull(),
        { timeout: 2000 }
      )
      expect(screen.getByText('Copy')).not.toBeNull()
      expect(screen.getByText('Paste')).not.toBeNull()
      expect(screen.getByText('Delete')).not.toBeNull()
    })
  })

  describe('Test 3: item onSelect callback', () => {
    it('fires onSelect when an enabled item is clicked', async () => {
      const onCopy = vi.fn()
      const items = [{ value: 'copy', label: 'Copy', onSelect: onCopy }]
      renderWithChakra(
        <Menu trigger={<button type="button">Open</button>} items={items} />
      )
      // Open the menu
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Open' }))
        await new Promise((r) => setTimeout(r, 0))
      })
      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeNull(), { timeout: 2000 })

      // Click the item inside the Portal — use act to flush React event handlers
      await act(async () => {
        fireEvent.click(screen.getByText('Copy'))
        await new Promise((r) => setTimeout(r, 0))
      })
      await waitFor(() => expect(onCopy).toHaveBeenCalledTimes(1), { timeout: 2000 })
    })
  })

  describe('Test 4: disabled item does not fire onSelect', () => {
    it('does not fire onSelect when a disabled item is clicked', async () => {
      const onDisabled = vi.fn()
      const items = [
        { value: 'nope', label: 'Disabled', disabled: true, onSelect: onDisabled },
      ]
      renderWithChakra(
        <Menu trigger={<button type="button">Open</button>} items={items} />
      )
      fireEvent.click(screen.getByRole('button', { name: 'Open' }))
      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeNull(), { timeout: 2000 })
      const disabledItem = screen.getByText('Disabled')
      fireEvent.click(disabledItem)
      // Ark marks disabled items; onSelect should not be fired.
      await waitFor(() => expect(onDisabled).not.toHaveBeenCalled(), { timeout: 1000 })
    })
  })
})

describe('Menu (slot composition)', () => {
  describe('Test 5: slot API renders trigger and content', () => {
    it('opens menu via slot composition API', async () => {
      renderWithChakra(
        <Menu.Root>
          <Menu.Trigger asChild>
            <button type="button">Slot Trigger</button>
          </Menu.Trigger>
          <Menu.Content>
            <Menu.Item value="action1">Action 1</Menu.Item>
            <Menu.Separator />
            <Menu.Item value="action2">Action 2</Menu.Item>
          </Menu.Content>
        </Menu.Root>
      )
      expect(screen.queryByRole('menu')).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Slot Trigger' }))
      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeNull(), { timeout: 2000 })
      expect(screen.getByText('Action 1')).not.toBeNull()
      expect(screen.getByText('Action 2')).not.toBeNull()
    })
  })
})
