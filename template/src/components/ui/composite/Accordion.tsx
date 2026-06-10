/**
 * Accordion — Chakra UI v3 (task-32 Batch 3a baseline)
 *
 * Wraps Chakra v3 `Accordion.*` compound parts with Linear semantic tokens.
 * Supports a data-driven item array API and a slot-composition API.
 *
 * Recipe convention (matches Tooltip.tsx / Tabs.tsx / Menu.tsx):
 *   1. Chakra Accordion.* parts as the rendering base — no raw HTML details/summary.
 *   2. Linear semantic tokens only — no hardcoded oklch/hex.
 *   3. a11y: Chakra/Ark renders button[aria-expanded], [aria-controls],
 *      [role="region"], [aria-labelledby] automatically.
 *   4. Interactive → 'use client'.
 *
 * Slot composition:
 *   <Accordion.Root multiple>
 *     <Accordion.Item value="item-1">
 *       <Accordion.Trigger>Section 1</Accordion.Trigger>
 *       <Accordion.Content>Content 1</Accordion.Content>
 *     </Accordion.Item>
 *   </Accordion.Root>
 *
 * Data-driven:
 *   <Accordion
 *     items={[
 *       { value: 'item-1', trigger: 'Section 1', content: <p>Body</p> },
 *     ]}
 *     multiple
 *   />
 */
'use client'

import * as React from 'react'
import { Accordion as ChakraAccordion } from '@chakra-ui/react'
import { ChevronDown } from 'lucide-react'

// ── Data-driven types ─────────────────────────────────────────────────────────

export interface AccordionEntry {
  /** Unique identifier for this item (used as the open/close key). */
  value: string
  /** Content rendered in the trigger button. */
  trigger: React.ReactNode
  /** Content revealed when the item is expanded. */
  content: React.ReactNode
  /** Whether this item is disabled. */
  disabled?: boolean
}

export interface AccordionProps {
  /** Accordion item definitions. */
  items: AccordionEntry[]
  /** Allow multiple items open simultaneously. Defaults to false (single). */
  multiple?: boolean
  /**
   * Allow the currently open item to be closed by clicking its trigger again.
   * Defaults to true (collapsible). Set to false for always-one-open behavior.
   */
  collapsible?: boolean
  /** Controlled open values (array of item value strings). */
  value?: string[]
  /** Default open values in uncontrolled mode. */
  defaultValue?: string[]
  /** Called when the open set changes. */
  onValueChange?: (value: string[]) => void
  className?: string
}

// ── Shared token constants ────────────────────────────────────────────────────

const ITEM_PROPS = {
  borderBottomWidth: '1px',
  borderColor: 'border.default',
  _last: { borderBottomWidth: '0' },
} as const

const TRIGGER_PROPS = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  w: 'full',
  px: '0',
  py: '4',
  fontSize: 'sm',
  fontWeight: 'medium',
  color: 'fg.default',
  textAlign: 'left' as const,
  cursor: 'pointer',
  _hover: { color: 'accent.text' },
  _disabled: { pointerEvents: 'none' as const, opacity: 0.4 },
  transition: 'colors',
} as const

const CONTENT_PROPS = {
  pb: '4',
  fontSize: 'sm',
  color: 'fg.muted',
  lineHeight: 'normal',
} as const

const INDICATOR_PROPS = {
  color: 'fg.muted',
  flexShrink: 0,
  ml: '2',
  transition: 'transform 200ms ease',
  _open: { transform: 'rotate(180deg)' },
} as const

// ── Sub-components for slot API ───────────────────────────────────────────────

function AccordionRootSlot({
  children,
  multiple,
  collapsible = true,
  value,
  defaultValue,
  onValueChange,
  className,
}: {
  children: React.ReactNode
  multiple?: boolean
  collapsible?: boolean
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  className?: string
}): React.ReactElement {
  return (
    <ChakraAccordion.Root
      multiple={multiple}
      collapsible={collapsible}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(e) => onValueChange?.(e.value)}
      borderTopWidth="1px"
      borderColor="border.default"
      className={className}
    >
      {children}
    </ChakraAccordion.Root>
  )
}
AccordionRootSlot.displayName = 'Accordion.Root'

function AccordionItemSlot({
  value,
  children,
  disabled,
  className,
}: {
  value: string
  children: React.ReactNode
  disabled?: boolean
  className?: string
}): React.ReactElement {
  return (
    <ChakraAccordion.Item value={value} disabled={disabled} {...ITEM_PROPS} className={className}>
      {children}
    </ChakraAccordion.Item>
  )
}
AccordionItemSlot.displayName = 'Accordion.Item'

function AccordionTriggerSlot({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}): React.ReactElement {
  return (
    <ChakraAccordion.ItemTrigger {...TRIGGER_PROPS} className={className}>
      {children}
      <ChakraAccordion.ItemIndicator {...INDICATOR_PROPS}>
        <ChevronDown size={16} aria-hidden="true" />
      </ChakraAccordion.ItemIndicator>
    </ChakraAccordion.ItemTrigger>
  )
}
AccordionTriggerSlot.displayName = 'Accordion.Trigger'

function AccordionContentSlot({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}): React.ReactElement {
  return (
    <ChakraAccordion.ItemContent>
      <ChakraAccordion.ItemBody {...CONTENT_PROPS} className={className}>
        {children}
      </ChakraAccordion.ItemBody>
    </ChakraAccordion.ItemContent>
  )
}
AccordionContentSlot.displayName = 'Accordion.Content'

// ── Data-driven component (primary API) ──────────────────────────────────────

/**
 * Accordion — data-driven expand/collapse panel renderer.
 *
 * Renders a bordered list of collapsible sections. Each item expands to reveal
 * its content with a smooth CSS transition. Keyboard navigation (Arrow /
 * Home / End) and ARIA attributes are provided by Chakra/Ark automatically.
 */
export function Accordion({
  items,
  multiple = false,
  collapsible = true,
  value,
  defaultValue,
  onValueChange,
  className,
}: AccordionProps): React.ReactElement {
  return (
    <ChakraAccordion.Root
      multiple={multiple}
      collapsible={collapsible}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(e) => onValueChange?.(e.value)}
      borderTopWidth="1px"
      borderColor="border.default"
      className={className}
    >
      {items.map((item) => (
        <ChakraAccordion.Item
          key={item.value}
          value={item.value}
          disabled={item.disabled}
          {...ITEM_PROPS}
        >
          <ChakraAccordion.ItemTrigger {...TRIGGER_PROPS}>
            {item.trigger}
            <ChakraAccordion.ItemIndicator {...INDICATOR_PROPS}>
              <ChevronDown size={16} aria-hidden="true" />
            </ChakraAccordion.ItemIndicator>
          </ChakraAccordion.ItemTrigger>
          <ChakraAccordion.ItemContent>
            <ChakraAccordion.ItemBody {...CONTENT_PROPS}>
              {item.content}
            </ChakraAccordion.ItemBody>
          </ChakraAccordion.ItemContent>
        </ChakraAccordion.Item>
      ))}
    </ChakraAccordion.Root>
  )
}

Accordion.displayName = 'Accordion'

// Attach slot sub-components.
Accordion.Root = AccordionRootSlot
Accordion.Item = AccordionItemSlot
Accordion.Trigger = AccordionTriggerSlot
Accordion.Content = AccordionContentSlot
