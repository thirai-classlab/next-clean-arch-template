/**
 * Menu — Chakra UI v3 (task-32 Batch 3a baseline)
 *
 * Wraps Chakra v3 `Menu.*` compound parts with Linear semantic tokens.
 * Supports a data-driven item array API and a slot-composition API.
 *
 * Recipe convention (matches Tooltip.tsx / Tabs.tsx / Breadcrumb.tsx):
 *   1. Chakra Menu.* parts as the rendering base — no raw HTML.
 *   2. Linear semantic tokens only — no hardcoded oklch/hex.
 *   3. a11y: Chakra/Ark renders role="menu", aria-haspopup, aria-expanded,
 *      keyboard nav (Arrow/Enter/Escape/Home/End) automatically.
 *   4. Interactive → 'use client'.
 *
 * Slot composition:
 *   <Menu.Root>
 *     <Menu.Trigger asChild>
 *       <button>Open</button>
 *     </Menu.Trigger>
 *     <Menu.Content>
 *       <Menu.Item value="copy">Copy</Menu.Item>
 *       <Menu.Item value="delete" colorScheme="danger">Delete</Menu.Item>
 *       <Menu.Separator />
 *     </Menu.Content>
 *   </Menu.Root>
 *
 * Data-driven:
 *   <Menu
 *     trigger={<button>Actions</button>}
 *     items={[
 *       { value: 'copy',   label: 'Copy' },
 *       { value: 'delete', label: 'Delete', colorScheme: 'danger', onSelect: () => {} },
 *     ]}
 *   />
 */
'use client'

import * as React from 'react'
import { Menu as ChakraMenu, Portal } from '@chakra-ui/react'

// ── Item type ─────────────────────────────────────────────────────────────────

export type MenuItemColorScheme = 'default' | 'danger'

export interface MenuItemEntry {
  value: string
  label: React.ReactNode
  /** When true the item is not interactive. */
  disabled?: boolean
  /** Render the item in danger (red) styling. */
  colorScheme?: MenuItemColorScheme
  /**
   * Called when this item is selected.
   * Implemented via onClick on the item element; Chakra v3 MenuItem does not
   * expose an onSelect prop directly — selection is handled at Menu.Root level
   * or via individual item onClick handlers.
   */
  onSelect?: () => void
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface MenuProps {
  /** Element that opens the menu (typically a Button or IconButton). */
  trigger: React.ReactElement
  /** Menu item definitions. Separators are added automatically between groups
   *  when `groups` is provided. */
  items: MenuItemEntry[]
  /** Accessible label for the menu (e.g. "Actions"). */
  'aria-label'?: string
  className?: string
}

// ── Shared token constants ────────────────────────────────────────────────────

/** Token-based item colors by colorScheme. */
const ITEM_COLOR: Record<MenuItemColorScheme, string> = {
  default: 'fg.default',
  danger: 'status.danger',
}

const CONTENT_PROPS = {
  bg: 'bg.elevated',
  borderWidth: '1px',
  borderColor: 'border.default',
  borderRadius: 'lg',
  boxShadow: 'md',
  p: '1',
  minW: '12rem',
} as const

const ITEM_BASE_PROPS = {
  borderRadius: 'md',
  px: '3',
  py: '2',
  fontSize: 'sm',
  cursor: 'pointer',
  _hover: { bg: 'bg.sunken' },
  _disabled: { pointerEvents: 'none' as const, opacity: 0.4 },
  transition: 'colors',
} as const

const SEPARATOR_PROPS = {
  borderColor: 'border.default',
  my: '1',
} as const

// ── Sub-components for slot API ───────────────────────────────────────────────

function MenuRootSlot({
  children,
}: {
  children: React.ReactNode
}): React.ReactElement {
  return <ChakraMenu.Root>{children}</ChakraMenu.Root>
}
MenuRootSlot.displayName = 'Menu.Root'

function MenuTriggerSlot({
  children,
  asChild,
}: {
  children: React.ReactNode
  asChild?: boolean
}): React.ReactElement {
  return <ChakraMenu.Trigger asChild={asChild}>{children}</ChakraMenu.Trigger>
}
MenuTriggerSlot.displayName = 'Menu.Trigger'

function MenuContentSlot({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}): React.ReactElement {
  return (
    <Portal>
      <ChakraMenu.Positioner>
        <ChakraMenu.Content {...CONTENT_PROPS} className={className}>
          {children}
        </ChakraMenu.Content>
      </ChakraMenu.Positioner>
    </Portal>
  )
}
MenuContentSlot.displayName = 'Menu.Content'

function MenuItemSlot({
  value,
  children,
  disabled,
  colorScheme = 'default',
  onSelect,
  className,
}: {
  value: string
  children: React.ReactNode
  disabled?: boolean
  colorScheme?: MenuItemColorScheme
  onSelect?: () => void
  className?: string
}): React.ReactElement {
  return (
    <ChakraMenu.Item
      value={value}
      disabled={disabled}
      onClick={disabled ? undefined : onSelect}
      color={ITEM_COLOR[colorScheme]}
      {...ITEM_BASE_PROPS}
      className={className}
    >
      {children}
    </ChakraMenu.Item>
  )
}
MenuItemSlot.displayName = 'Menu.Item'

function MenuSeparatorSlot({ className }: { className?: string }): React.ReactElement {
  return <ChakraMenu.Separator {...SEPARATOR_PROPS} className={className} />
}
MenuSeparatorSlot.displayName = 'Menu.Separator'

// ── Data-driven component (primary API) ──────────────────────────────────────

/**
 * Menu — data-driven dropdown renderer.
 *
 * Renders a trigger + portal-positioned menu panel. Items are rendered via
 * the `items` array prop. For full layout control use the slot-composition API.
 */
export function Menu({
  trigger,
  items,
  'aria-label': ariaLabel,
  className,
}: MenuProps): React.ReactElement {
  return (
    <ChakraMenu.Root>
      <ChakraMenu.Trigger asChild>{trigger}</ChakraMenu.Trigger>
      <Portal>
        <ChakraMenu.Positioner>
          <ChakraMenu.Content
            {...CONTENT_PROPS}
            aria-label={ariaLabel}
            className={className}
          >
            {items.map((item) => (
              <ChakraMenu.Item
                key={item.value}
                value={item.value}
                disabled={item.disabled}
                onClick={item.disabled ? undefined : item.onSelect}
                color={ITEM_COLOR[item.colorScheme ?? 'default']}
                {...ITEM_BASE_PROPS}
              >
                {item.label}
              </ChakraMenu.Item>
            ))}
          </ChakraMenu.Content>
        </ChakraMenu.Positioner>
      </Portal>
    </ChakraMenu.Root>
  )
}

Menu.displayName = 'Menu'

// Attach slot sub-components.
Menu.Root = MenuRootSlot
Menu.Trigger = MenuTriggerSlot
Menu.Content = MenuContentSlot
Menu.Item = MenuItemSlot
Menu.Separator = MenuSeparatorSlot
