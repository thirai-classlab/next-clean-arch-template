/**
 * Modal — Chakra UI v3 (Phase 3 composite migration)
 *
 * Re-implemented on top of Chakra v3 `Dialog` (was @radix-ui/react-dialog).
 * The exported TypeScript API (ModalProps, the `Modal` named export) is kept
 * byte-for-byte identical so every consumer (admin pages, gallery, dev page)
 * compiles unchanged.
 *
 * Recipe convention (see primitive/Button.tsx + theme/system.ts):
 *   1. Use Chakra Dialog.* parts as the rendering base — no raw HTML.
 *   2. Apply Linear-theme semantic tokens via style props (bg.elevated,
 *      fg.default, fg.muted, etc.) — no hardcoded oklch/hex.
 *   3. a11y (role="dialog", aria-modal, aria-labelledby/-describedby, focus
 *      trap, Escape + outside-click dismiss) is delegated to Chakra/Ark.
 *   4. Interactive → 'use client'.
 *
 * API mapping from the old radix props:
 *   open / onOpenChange      → Dialog.Root open / onOpenChange (event.open)
 *   isCentered (implicit)    → placement="center"
 *   size                     → maxW token map (preserves old modal widths)
 *   title                    → Dialog.Title (auto-wires aria-labelledby)
 *   description              → Dialog.Description (auto-wires aria-describedby)
 *   footer                   → Dialog.Footer
 */
'use client'

import * as React from 'react'
import { Dialog, Portal } from '@chakra-ui/react'
import { type ModalSize } from './_base/dialog-base'

export interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  size?: ModalSize
  children: React.ReactNode
  footer?: React.ReactNode
}

// Size → max-width token map (mirrors the old modalSizeClass widths).
const MODAL_MAX_W: Record<ModalSize, string> = {
  sm: '24rem', // max-w-sm
  md: '28rem', // max-w-md
  lg: '42rem', // max-w-2xl
  xl: '56rem', // max-w-4xl
  full: '95vw',
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  children,
  footer,
}: ModalProps): React.ReactElement {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      placement="center"
    >
      <Portal>
        <Dialog.Backdrop bg="black/40" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="bg.elevated"
            color="fg.default"
            borderRadius="lg"
            boxShadow="lg"
            p="6"
            width="full"
            maxW={MODAL_MAX_W[size]}
            maxH={size === 'full' ? '95vh' : undefined}
          >
            <Dialog.Header p="0" mb="2">
              <Dialog.Title fontSize="lg" fontWeight="semibold" color="fg.default">
                {title}
              </Dialog.Title>
            </Dialog.Header>

            {description ? (
              <Dialog.Description fontSize="sm" color="fg.muted" mb="4">
                {description}
              </Dialog.Description>
            ) : null}

            <Dialog.Body p="0" fontSize="md" color="fg.default">
              {children}
            </Dialog.Body>

            {footer ? (
              <Dialog.Footer
                p="0"
                mt="6"
                display="flex"
                alignItems="center"
                justifyContent="flex-end"
                gap="2"
              >
                {footer}
              </Dialog.Footer>
            ) : null}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

Modal.displayName = 'Modal'
