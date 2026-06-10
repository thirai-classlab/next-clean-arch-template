/**
 * Tooltip — Chakra UI v3 (Phase 3 composite migration)
 *
 * Re-implemented on top of Chakra v3 `Tooltip` (was @radix-ui/react-tooltip).
 * The exported TypeScript API (TooltipProps, the `Tooltip` named export) is
 * kept identical so every consumer compiles unchanged.
 *
 * Recipe convention (see primitive/Button.tsx + theme/system.ts):
 *   1. Use Chakra Tooltip.* parts as the rendering base — no raw HTML.
 *   2. Apply Linear-theme semantic tokens via style props (bg = fg.default
 *      inverted surface, color = bg.base) — no hardcoded oklch/hex.
 *   3. a11y (role="tooltip", aria-describedby on the trigger) is delegated to
 *      Chakra/Ark.
 *   4. Interactive → 'use client'.
 *
 * API mapping from the old radix props:
 *   content → Tooltip.Content children
 *   side    → positioning={{ placement: side }}
 *   delay   → openDelay (hover/focus open delay, ms)
 *   children→ Tooltip.Trigger asChild child
 */
'use client'

import * as React from 'react'
import { Tooltip as ChakraTooltip, Portal } from '@chakra-ui/react'

export interface TooltipProps {
  /** Content rendered inside the tooltip bubble. */
  content: React.ReactNode
  /** Side of the trigger to render the tooltip. Defaults to `top`. */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Hover/focus open delay in milliseconds. Defaults to 500ms. */
  delay?: number
  /** Trigger element. Must accept a ref and forward props. */
  children: React.ReactElement
}

export function Tooltip({
  content,
  side = 'top',
  delay = 500,
  children,
}: TooltipProps): React.ReactElement {
  return (
    <ChakraTooltip.Root
      openDelay={delay}
      closeDelay={150}
      positioning={{ placement: side }}
    >
      <ChakraTooltip.Trigger asChild>{children}</ChakraTooltip.Trigger>
      <Portal>
        <ChakraTooltip.Positioner>
          <ChakraTooltip.Content
            maxW="xs"
            borderRadius="sm"
            bg="fg.default"
            color="bg.base"
            px="2"
            py="1"
            fontSize="sm"
            boxShadow="md"
          >
            <ChakraTooltip.Arrow>
              <ChakraTooltip.ArrowTip />
            </ChakraTooltip.Arrow>
            {content}
          </ChakraTooltip.Content>
        </ChakraTooltip.Positioner>
      </Portal>
    </ChakraTooltip.Root>
  )
}

Tooltip.displayName = 'Tooltip'
