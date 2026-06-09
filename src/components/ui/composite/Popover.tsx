/**
 * Popover — Chakra UI v3 (Phase 3 composite migration)
 *
 * Re-implemented on top of Chakra v3 `Popover` (was @radix-ui/react-popover).
 * The exported TypeScript API (PopoverProps, the `Popover` named export) is
 * kept identical so every consumer compiles unchanged.
 *
 * Recipe convention (see primitive/Button.tsx + theme/system.ts):
 *   1. Use Chakra Popover.* parts as the rendering base — no raw HTML.
 *   2. Apply Linear-theme semantic tokens via style props (bg.overlay,
 *      fg.default, border.default) — no hardcoded oklch/hex.
 *   3. a11y (non-modal dialog semantics, ESC + outside-click dismiss, focus
 *      return to trigger) is delegated to Chakra/Ark.
 *   4. Interactive → 'use client'.
 *
 * API mapping from the old radix props:
 *   trigger → Popover.Trigger asChild child
 *   content → Popover.Body children
 *   side    → positioning placement axis ('top'|'right'|'bottom'|'left')
 *   align   → positioning placement suffix ('start'|'end'; 'center' = bare axis)
 *   width   → 'trigger' (match anchor) | 'auto' | CSS length
 */
'use client'

import * as React from 'react'
import { Popover as ChakraPopover, Portal } from '@chakra-ui/react'

type PopoverRootProps = React.ComponentProps<typeof ChakraPopover.Root>
type Placement = NonNullable<
  NonNullable<PopoverRootProps['positioning']>['placement']
>

export interface PopoverProps {
  /** Trigger element. Must accept a ref. */
  trigger: React.ReactElement
  /** Content rendered inside the popover surface. */
  content: React.ReactNode
  /** Side of the trigger to render the content. Defaults to `bottom`. */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Alignment along the trigger edge. Defaults to `center`. */
  align?: 'start' | 'center' | 'end'
  /**
   * Content width:
   *  - `'trigger'`: match trigger width (Chakra `--available-width` anchor).
   *  - `'auto'`: shrink to content.
   *  - CSS length string (e.g. `'320px'`).
   * Defaults to `'auto'`.
   */
  width?: 'trigger' | 'auto' | string
}

/**
 * Compose Chakra's `placement` token from the old side + align props.
 * Chakra placements are `<side>` for center alignment and `<side>-start` /
 * `<side>-end` for edge alignment (e.g. `bottom`, `right-end`).
 */
function toPlacement(
  side: NonNullable<PopoverProps['side']>,
  align: NonNullable<PopoverProps['align']>
): Placement {
  if (align === 'center') {
    return side as Placement
  }
  return `${side}-${align}` as Placement
}

export function Popover({
  trigger,
  content,
  side = 'bottom',
  align = 'center',
  width = 'auto',
}: PopoverProps): React.ReactElement {
  const widthProp =
    width === 'trigger'
      ? 'var(--available-width)'
      : width === 'auto'
        ? undefined
        : width

  return (
    <ChakraPopover.Root positioning={{ placement: toPlacement(side, align) }}>
      <ChakraPopover.Trigger asChild>{trigger}</ChakraPopover.Trigger>
      <Portal>
        <ChakraPopover.Positioner>
          <ChakraPopover.Content
            width={widthProp}
            bg="bg.overlay"
            color="fg.default"
            borderRadius="md"
            borderWidth="1px"
            borderColor="border.default"
            boxShadow="md"
            p="3"
            fontSize="md"
            _focus={{ outline: 'none' }}
          >
            <ChakraPopover.Arrow />
            <ChakraPopover.Body p="0">{content}</ChakraPopover.Body>
          </ChakraPopover.Content>
        </ChakraPopover.Positioner>
      </Portal>
    </ChakraPopover.Root>
  )
}

Popover.displayName = 'Popover'
