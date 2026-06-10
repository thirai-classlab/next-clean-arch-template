/**
 * CommandPalette — cmdk@^1.1.1 wrap with Chakra v3 primitives (Batch 3b, task-32)
 *
 * A keyboard-driven command/search palette modal. Uses cmdk for fuzzy-search
 * state machine, Chakra Dialog for the modal overlay, and Chakra Box/Input
 * for styled surfaces with Linear semantic tokens.
 *
 * Architecture:
 *   - cmdk <Command>          → fuzzy-filter state + keyboard nav
 *   - cmdk <Command.Input>    → search input (rendered inside Chakra Box)
 *   - cmdk <Command.List>     → filtered results container
 *   - cmdk <Command.Group>    → optional grouped sections
 *   - cmdk <Command.Item>     → selectable result row
 *   - cmdk <Command.Empty>    → shown when filtered count is 0
 *   - Chakra Dialog.Root      → modal overlay with backdrop
 *
 * Design:
 *   - Semantic tokens only (bg.elevated, fg.default, fg.muted, border.default,
 *     accent.subtle, accent.text).
 *   - Max-height scroll on the list to keep the palette compact.
 *   - Keyboard shortcut hint ("⌘K") is displayed in the trigger area but
 *     wired externally — this component only manages open/close state.
 *
 * a11y:
 *   - role="dialog" + aria-modal on the Chakra Dialog.Content.
 *   - cmdk <Command> is role="combobox" by default; <Command.List> is
 *     role="listbox"; each <Command.Item> is role="option".
 *   - aria-label on the search input via the `inputPlaceholder` prop.
 *   - Escape closes the dialog (Dialog.Root handles this natively).
 *
 * 'use client' is required: uses open state + keyboard events.
 */
'use client'

import * as React from 'react'
import { Command } from 'cmdk'
import {
  Dialog,
  Portal,
  Box,
} from '@chakra-ui/react'

// ── Types ────────────────────────────────────────────────────────────────────

export interface CommandItem {
  /** Unique identifier and cmdk value used for filtering. */
  value: string
  /** Display label shown in the result row. */
  label: string
  /** Optional secondary hint (e.g. keyboard shortcut or category). */
  hint?: string
  /** Optional icon placed left of the label. Should be decorative (16×16). */
  icon?: React.ReactNode
  /** Called when the item is selected via click or Enter. */
  onSelect: () => void
  /** Disable this item (shown but not selectable). */
  disabled?: boolean
}

export interface CommandGroup {
  /** Section heading shown above the group items. */
  heading: string
  /** Items belonging to this group. */
  items: CommandItem[]
}

export interface CommandPaletteProps {
  /** Whether the palette modal is visible. Controlled. */
  open: boolean
  /** Called when the palette requests to close (Escape / backdrop). */
  onOpenChange: (open: boolean) => void
  /**
   * Flat list of items (no grouping). Mutually exclusive with `groups`.
   * If both are provided, `groups` takes precedence.
   */
  items?: CommandItem[]
  /**
   * Grouped items. Each group has a heading and a list of items.
   * Mutually exclusive with `items`.
   */
  groups?: CommandGroup[]
  /** Placeholder text for the search input. Default: "コマンドを検索…" */
  inputPlaceholder?: string
  /** Message shown when the filtered result count reaches 0. Default: "結果が見つかりませんでした" */
  emptyMessage?: string
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * CommandPalette — fuzzy-search command menu modal.
 *
 * Usage:
 *   const [open, setOpen] = useState(false)
 *
 *   // Wire ⌘K at the call site:
 *   useEffect(() => {
 *     const handler = (e: KeyboardEvent) => {
 *       if ((e.metaKey || e.ctrlKey) && e.key === 'k') setOpen(true)
 *     }
 *     window.addEventListener('keydown', handler)
 *     return () => window.removeEventListener('keydown', handler)
 *   }, [])
 *
 *   <CommandPalette
 *     open={open}
 *     onOpenChange={setOpen}
 *     groups={[
 *       { heading: 'ナビゲーション', items: [...] },
 *       { heading: 'アクション',     items: [...] },
 *     ]}
 *   />
 */
export function CommandPalette({
  open,
  onOpenChange,
  items,
  groups,
  inputPlaceholder = 'コマンドを検索…',
  emptyMessage = '結果が見つかりませんでした',
}: CommandPaletteProps): React.ReactElement {
  // Resolve flat vs grouped data
  const resolvedGroups: CommandGroup[] =
    groups ??
    (items ? [{ heading: '', items }] : [])

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      placement="top"
      motionPreset="slide-in-bottom"
    >
      <Portal>
        {/* Backdrop */}
        <Dialog.Backdrop bg="black/50" backdropFilter="blur(4px)" />

        <Dialog.Positioner pt={{ base: '10', md: '20' }} px="4">
          <Dialog.Content
            bg="bg.elevated"
            borderWidth="1px"
            borderColor="border.default"
            borderRadius="xl"
            boxShadow="overlay"
            overflow="hidden"
            width="full"
            maxW="38rem"
            p="0"
            aria-label="コマンドパレット"
            /* cmdk Command is the scroll/focus root; Dialog.Content is purely visual */
          >
            {/* ── cmdk Command root ─────────────────────────────── */}
            <Command
              label={inputPlaceholder}
              style={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Search input row */}
              <Box
                borderBottomWidth="1px"
                borderColor="border.default"
                px="4"
                py="3"
                display="flex"
                alignItems="center"
                gap="2"
              >
                {/* Search icon */}
                <Box
                  as="span"
                  color="fg.muted"
                  flexShrink={0}
                  aria-hidden="true"
                  display="flex"
                  alignItems="center"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </Box>

                <Command.Input
                  placeholder={inputPlaceholder}
                  aria-label={inputPlaceholder}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '0.875rem',
                    color: 'inherit',
                  }}
                />

                {/* Escape hint */}
                <Box
                  as="kbd"
                  fontSize="xs"
                  color="fg.subtle"
                  bg="bg.sunken"
                  borderWidth="1px"
                  borderColor="border.default"
                  borderRadius="sm"
                  px="1.5"
                  py="0.5"
                  fontFamily="mono"
                  flexShrink={0}
                >
                  ESC
                </Box>
              </Box>

              {/* Result list */}
              <Command.List
                style={{
                  maxHeight: '20rem',
                  overflowY: 'auto',
                  padding: '4px',
                }}
              >
                <Command.Empty
                  style={{
                    padding: '2rem 1rem',
                    textAlign: 'center',
                    fontSize: '0.875rem',
                    color: 'var(--chakra-colors-fg-muted)',
                  }}
                >
                  {emptyMessage}
                </Command.Empty>

                {resolvedGroups.map((group) => (
                  <Command.Group
                    key={group.heading || '__default__'}
                    heading={group.heading || undefined}
                  >
                    {group.items.map((item) => (
                      <CommandItemRow
                        key={item.value}
                        item={item}
                        onClose={() => onOpenChange(false)}
                      />
                    ))}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

CommandPalette.displayName = 'CommandPalette'

// ── Internal: single result row ───────────────────────────────────────────────

interface CommandItemRowProps {
  item: CommandItem
  onClose: () => void
}

function CommandItemRow({ item, onClose }: CommandItemRowProps): React.ReactElement {
  const handleSelect = React.useCallback(() => {
    if (item.disabled) return
    item.onSelect()
    onClose()
  }, [item, onClose])

  return (
    <Command.Item
      value={item.value}
      disabled={item.disabled}
      onSelect={handleSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '0.875rem',
        cursor: item.disabled ? 'not-allowed' : 'pointer',
        opacity: item.disabled ? 0.45 : 1,
        /* cmdk adds data-selected attribute on keyboard focus */
      }}
      /* cmdk exposes data-selected; we apply accent.subtle bg via a CSS var fallback */
      data-palette-item
    >
      {item.icon ? (
        <Box
          as="span"
          color="fg.muted"
          display="flex"
          alignItems="center"
          flexShrink={0}
          aria-hidden="true"
        >
          {item.icon}
        </Box>
      ) : null}

      <Box as="span" flex="1" color="fg.default" minW="0">
        {item.label}
      </Box>

      {item.hint ? (
        <Box
          as="span"
          fontSize="xs"
          color="fg.subtle"
          fontFamily="mono"
          flexShrink={0}
        >
          {item.hint}
        </Box>
      ) : null}
    </Command.Item>
  )
}

CommandItemRow.displayName = 'CommandItemRow'
