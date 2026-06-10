/**
 * Tabs — Chakra UI v3 (Phase 3 composite migration, Batch 2)
 *
 * Re-implemented on top of Chakra v3 `Tabs` (was @radix-ui/react-tabs).
 * The exported TypeScript API (TabsProps, TabsItem, the `Tabs` named export,
 * the `items` array shape, `variant`, controlled/uncontrolled modes) is kept
 * identical so every consumer (dev/composite page, admin gallery) compiles
 * unchanged.
 *
 * Recipe convention (see primitive/Button.tsx + theme/system.ts + composite/Modal.tsx):
 *   1. Use Chakra Tabs.* parts as the rendering base — no raw HTML, no radix.
 *   2. variant ('underline' | 'pill') maps to literal style-prop overrides
 *      using semantic tokens (accent.default, fg.default, border.default, …) —
 *      no cva/className, no hardcoded oklch/hex.
 *   3. a11y (role="tab"/"tabpanel", aria-labelledby, roving tabindex, Arrow /
 *      Home / End keyboard nav, disabled skip) is delegated to Chakra/Ark.
 *   4. Interactive → 'use client'.
 *
 * API mapping from the old radix props:
 *   defaultValue            → Tabs.Root defaultValue (uncontrolled)
 *   value                   → Tabs.Root value (controlled)
 *   onValueChange(value)    → Tabs.Root onValueChange (e.value)
 *   items[].value/label/…   → Tabs.Trigger value / children / disabled
 *   items[].content         → Tabs.Content children
 */
'use client'

import * as React from 'react'
import { Tabs as ChakraTabs } from '@chakra-ui/react'

export interface TabsItem {
  value: string
  label: string
  content: React.ReactNode
  disabled?: boolean
}

export interface TabsProps {
  /** Initial active tab in uncontrolled mode. */
  defaultValue?: string
  /** Active tab in controlled mode. Use with `onValueChange`. */
  value?: string
  /** Notified when the active tab changes (both controlled and uncontrolled modes). */
  onValueChange?: (value: string) => void
  /** Tab items. Each renders a trigger + tabpanel. */
  items: TabsItem[]
  /** Visual style. Defaults to `underline`. */
  variant?: 'underline' | 'pill'
  /**
   * When true, the tab list stretches to the full width of its container and
   * each trigger flexes equally (task #37 Step 4, code HIGH-R3-2). Defaults to
   * false (`fit-content`), preserving the existing layout for all consumers.
   */
  fullWidth?: boolean
}

/**
 * Thin wrapper around Chakra v3 `Tabs` that applies project design tokens.
 *
 * - ARIA APG Tabs Pattern compliant (Arrow / Home / End navigation built-in).
 * - Each panel is `role="tabpanel"` with `aria-labelledby` pointing to its tab id.
 * - Controlled (`value` + `onValueChange`) or uncontrolled (`defaultValue`).
 */
export function Tabs({
  defaultValue,
  value,
  onValueChange,
  items,
  variant = 'underline',
  fullWidth = false,
}: TabsProps): React.ReactElement {
  const isUnderline = variant === 'underline'

  // List container styling (underline: bottom border rail; pill: sunken track).
  const listProps = isUnderline
    ? {
        borderBottomWidth: '1px',
        borderColor: 'border.default',
        gap: '1',
      }
    : {
        p: '1',
        borderRadius: 'md',
        bg: 'bg.sunken',
        gap: '1',
      }

  // Trigger styling per variant. Active state targets data-[selected] (Ark).
  const triggerProps = isUnderline
    ? {
        px: '3',
        py: '2',
        fontSize: 'md',
        fontWeight: 'medium',
        color: 'fg.muted',
        borderBottomWidth: '2px',
        borderColor: 'transparent',
        marginBottom: '-1px',
        _hover: { color: 'fg.default' },
        _selected: {
          color: 'fg.default',
          borderColor: 'accent.default',
        },
        _disabled: { pointerEvents: 'none', opacity: 0.5 },
      }
    : {
        px: '3',
        py: '2',
        fontSize: 'md',
        fontWeight: 'medium',
        color: 'fg.muted',
        borderRadius: 'md',
        _hover: { bg: 'bg.sunken', color: 'fg.default' },
        _selected: {
          bg: 'accent.default',
          color: 'white',
        },
        _disabled: { pointerEvents: 'none', opacity: 0.5 },
      }

  return (
    <ChakraTabs.Root
      defaultValue={defaultValue}
      value={value}
      onValueChange={(e) => onValueChange?.(e.value)}
      display="flex"
      flexDirection="column"
      gap="3"
    >
      <ChakraTabs.List
        display={fullWidth ? 'flex' : 'inline-flex'}
        alignItems="center"
        width={fullWidth ? 'full' : 'fit-content'}
        {...listProps}
      >
        {items.map((item) => (
          <ChakraTabs.Trigger
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            transition="colors"
            flex={fullWidth ? '1' : undefined}
            justifyContent={fullWidth ? 'center' : undefined}
            {...triggerProps}
          >
            {item.label}
          </ChakraTabs.Trigger>
        ))}
      </ChakraTabs.List>

      {items.map((item) => (
        <ChakraTabs.Content key={item.value} value={item.value}>
          {item.content}
        </ChakraTabs.Content>
      ))}
    </ChakraTabs.Root>
  )
}

Tabs.displayName = 'Tabs'
