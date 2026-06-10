/**
 * Breadcrumb — Chakra UI v3 (task-32 Batch 3a baseline)
 *
 * Wraps Chakra v3 `Breadcrumb.*` compound parts with Linear semantic tokens.
 * Supports a data-driven item array API and a slot-composition API for
 * full control over the rendered crumbs.
 *
 * Recipe convention (matches Tooltip.tsx / Tabs.tsx):
 *   1. Chakra Breadcrumb.* parts as the rendering base — no raw HTML nav.
 *   2. Linear semantic tokens only — no hardcoded oklch/hex.
 *   3. a11y: Chakra/Ark renders the outer <nav aria-label="breadcrumb"> and
 *      wires <ol>/<li> structure; current page gets aria-current="page".
 *   4. Interactive (has data-driven hover styles) → 'use client'.
 *
 * Slot composition:
 *   <Breadcrumb.Root>
 *     <Breadcrumb.Item href="/settings">Settings</Breadcrumb.Item>
 *     <Breadcrumb.CurrentItem>API Keys</Breadcrumb.CurrentItem>
 *   </Breadcrumb.Root>
 *
 * Data-driven:
 *   <Breadcrumb
 *     items={[
 *       { label: 'Settings', href: '/settings' },
 *       { label: 'API Keys' },              // no href → rendered as current page
 *     ]}
 *   />
 */
'use client'

import * as React from 'react'
import { Breadcrumb as ChakraBreadcrumb } from '@chakra-ui/react'

// ── Sub-component types ──────────────────────────────────────────────────────

export interface BreadcrumbItemProps {
  /** Link destination. Omit for the current (last) page item. */
  href?: string
  children: React.ReactNode
  className?: string
}

export interface BreadcrumbCurrentItemProps {
  children: React.ReactNode
  className?: string
}

// ── Data-driven API types ────────────────────────────────────────────────────

export interface BreadcrumbEntry {
  label: string
  /** If omitted the entry is rendered as the current page (no link). */
  href?: string
}

export interface BreadcrumbProps {
  /** Breadcrumb trail. The last entry with no href is the current page. */
  items: BreadcrumbEntry[]
  /** Accessible label for the nav landmark. Defaults to "パンくずリスト". */
  'aria-label'?: string
  className?: string
}

// ── Shared token constants ────────────────────────────────────────────────────

const LINK_PROPS = {
  color: 'fg.muted',
  fontSize: 'sm',
  _hover: { color: 'fg.default', textDecoration: 'underline' },
  transition: 'colors',
} as const

const CURRENT_PROPS = {
  color: 'fg.default',
  fontSize: 'sm',
  fontWeight: 'medium',
  cursor: 'default',
} as const

// ── Slot sub-components ───────────────────────────────────────────────────────

/**
 * A single breadcrumb link item (not the current page).
 * Must be placed inside <Breadcrumb.Root>.
 */
function BreadcrumbItemSlot({
  href,
  children,
  className,
}: BreadcrumbItemProps): React.ReactElement {
  return (
    <ChakraBreadcrumb.Item className={className}>
      <ChakraBreadcrumb.Link href={href} {...LINK_PROPS}>
        {children}
      </ChakraBreadcrumb.Link>
      <ChakraBreadcrumb.Separator color="fg.subtle" mx="1" aria-hidden="true" />
    </ChakraBreadcrumb.Item>
  )
}
BreadcrumbItemSlot.displayName = 'Breadcrumb.Item'

/**
 * The current-page breadcrumb (last item, no link, aria-current="page").
 * Must be placed inside <Breadcrumb.Root>.
 */
function BreadcrumbCurrentItemSlot({
  children,
  className,
}: BreadcrumbCurrentItemProps): React.ReactElement {
  return (
    <ChakraBreadcrumb.Item className={className}>
      <ChakraBreadcrumb.CurrentLink {...CURRENT_PROPS}>
        {children}
      </ChakraBreadcrumb.CurrentLink>
    </ChakraBreadcrumb.Item>
  )
}
BreadcrumbCurrentItemSlot.displayName = 'Breadcrumb.CurrentItem'

/**
 * Root wrapper for the slot-composition API.
 * Renders <nav aria-label="…"><ol>…</ol></nav> via Chakra.
 */
function BreadcrumbRootSlot({
  children,
  'aria-label': ariaLabel = 'パンくずリスト',
  className,
}: {
  children: React.ReactNode
  'aria-label'?: string
  className?: string
}): React.ReactElement {
  return (
    <ChakraBreadcrumb.Root aria-label={ariaLabel} className={className}>
      <ChakraBreadcrumb.List display="flex" alignItems="center" flexWrap="wrap" gap="0">
        {children}
      </ChakraBreadcrumb.List>
    </ChakraBreadcrumb.Root>
  )
}
BreadcrumbRootSlot.displayName = 'Breadcrumb.Root'

// ── Data-driven component (primary API) ──────────────────────────────────────

/**
 * Breadcrumb — data-driven trail renderer.
 *
 * Renders all non-last items as links followed by a separator; the last item
 * is always rendered as `<BreadcrumbCurrentLink>` with `aria-current="page"`.
 */
export function Breadcrumb({
  items,
  'aria-label': ariaLabel = 'パンくずリスト',
  className,
}: BreadcrumbProps): React.ReactElement {
  return (
    <ChakraBreadcrumb.Root aria-label={ariaLabel} className={className}>
      <ChakraBreadcrumb.List display="flex" alignItems="center" flexWrap="wrap" gap="0">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          if (isLast) {
            return (
              <ChakraBreadcrumb.Item key={`${item.label}-${index}`}>
                <ChakraBreadcrumb.CurrentLink {...CURRENT_PROPS}>
                  {item.label}
                </ChakraBreadcrumb.CurrentLink>
              </ChakraBreadcrumb.Item>
            )
          }

          return (
            <ChakraBreadcrumb.Item key={`${item.label}-${index}`}>
              <ChakraBreadcrumb.Link href={item.href} {...LINK_PROPS}>
                {item.label}
              </ChakraBreadcrumb.Link>
              <ChakraBreadcrumb.Separator
                color="fg.subtle"
                mx="1"
                aria-hidden="true"
              />
            </ChakraBreadcrumb.Item>
          )
        })}
      </ChakraBreadcrumb.List>
    </ChakraBreadcrumb.Root>
  )
}

Breadcrumb.displayName = 'Breadcrumb'

// Attach slot sub-components for the composition API.
Breadcrumb.Root = BreadcrumbRootSlot
Breadcrumb.Item = BreadcrumbItemSlot
Breadcrumb.CurrentItem = BreadcrumbCurrentItemSlot
