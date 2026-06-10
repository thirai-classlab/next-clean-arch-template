/**
 * Drawer — Chakra UI v3 (Phase 3 composite migration)
 *
 * Re-implemented on top of Chakra v3 `Drawer` (was @radix-ui/react-dialog).
 * The exported TypeScript API (DrawerProps, the `Drawer` named export) is kept
 * identical so every consumer compiles unchanged.
 *
 * Recipe convention (see primitive/Button.tsx + theme/system.ts):
 *   1. Use Chakra Drawer.* parts as the rendering base — no raw HTML.
 *   2. Apply Linear-theme semantic tokens via style props (bg.elevated,
 *      fg.default, border.default) — no hardcoded oklch/hex.
 *   3. a11y (role="dialog", aria-modal, aria-labelledby, focus trap, Escape +
 *      outside-click dismiss) is delegated to Chakra/Ark.
 *   4. Interactive → 'use client'.
 *
 * API mapping from the old radix props:
 *   open / onOpenChange  → Drawer.Root open / onOpenChange (event.open)
 *   side ('left'|'right')→ placement ('start'|'end') (RTL-aware in v3)
 *   size                 → width token map (preserves old drawer widths)
 *   title                → Drawer.Header / Drawer.Title (aria-labelledby)
 *
 * Slide-in animation + prefers-reduced-motion handling is delegated to
 * Chakra/Ark's built-in drawer transitions (they already honor the user's
 * reduced-motion preference), so the bespoke usePrefersReducedMotion hook
 * and inline transition tokens from the radix implementation are dropped.
 *
 * Close button (Drawer.CloseTrigger):
 *   The header now renders a `Drawer.CloseTrigger` (top-right icon button) so
 *   the drawer panel exposes a focusable dismiss control. This is required for
 *   a real focus-trap to cycle (with only the panel focusable, Zag keeps focus
 *   pinned to the panel itself). The button is internal UI — the public
 *   DrawerProps API is unchanged, so every consumer compiles unchanged.
 */
'use client'

import * as React from 'react'
import { Drawer as ChakraDrawer, Portal } from '@chakra-ui/react'
import { X } from 'lucide-react'
import { type DrawerSide, type DrawerSize } from './_base/dialog-base'

export interface DrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  side?: DrawerSide
  title: string
  size?: DrawerSize
  children: React.ReactNode
}

// side ('left'|'right') → Chakra v3 placement ('start'|'end').
const SIDE_PLACEMENT: Record<DrawerSide, 'start' | 'end'> = {
  left: 'start',
  right: 'end',
}

// Size → width token map (mirrors the old drawerSizeClass widths).
const DRAWER_WIDTH: Record<DrawerSize, string> = {
  sm: '18rem', // w-72
  md: '24rem', // w-96
  lg: '32rem', // w-[32rem]
}

export function Drawer({
  open,
  onOpenChange,
  side = 'right',
  title,
  size = 'md',
  children,
}: DrawerProps): React.ReactElement {
  return (
    <ChakraDrawer.Root
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      placement={SIDE_PLACEMENT[side]}
    >
      <Portal>
        <ChakraDrawer.Backdrop bg="black/40" />
        <ChakraDrawer.Positioner>
          <ChakraDrawer.Content
            bg="bg.elevated"
            color="fg.default"
            boxShadow="lg"
            width={DRAWER_WIDTH[size]}
            maxW="full"
            p="6"
          >
            <ChakraDrawer.Header
              p="0"
              mb="4"
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              gap="4"
            >
              <ChakraDrawer.Title
                fontSize="lg"
                fontWeight="semibold"
                color="fg.default"
              >
                {title}
              </ChakraDrawer.Title>

              <ChakraDrawer.CloseTrigger
                data-testid="drawer-close"
                aria-label="Close drawer"
                display="inline-flex"
                alignItems="center"
                justifyContent="center"
                borderRadius="md"
                p="1"
                color="fg.muted"
                cursor="pointer"
                _hover={{ bg: 'bg.sunken', color: 'fg.default' }}
              >
                <X size={20} aria-hidden="true" />
              </ChakraDrawer.CloseTrigger>
            </ChakraDrawer.Header>

            <ChakraDrawer.Body p="0" fontSize="md" color="fg.default">
              {children}
            </ChakraDrawer.Body>
          </ChakraDrawer.Content>
        </ChakraDrawer.Positioner>
      </Portal>
    </ChakraDrawer.Root>
  )
}

Drawer.displayName = 'Drawer'
