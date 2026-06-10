/**
 * ConfirmDialog — Chakra UI v3 (Phase 6 Batch 2 baseline)
 *
 * A small, opinionated confirmation dialog built on Chakra v3 `Dialog`.
 * Companion to the more general `Modal.tsx` (Phase 3 composite). Use this
 * when the interaction is strictly "yes/no" — bulk delete, sign out,
 * destructive admin action, etc.
 *
 * API mapping:
 *   open / onOpenChange  → Dialog.Root open / onOpenChange (event.open)
 *   title                → Dialog.Title (auto-wires aria-labelledby)
 *   message              → Dialog.Description (auto-wires aria-describedby)
 *   confirmLabel/cancel  → footer button labels (defaults "確認"/"キャンセル")
 *   tone="danger"        → confirm button colorPalette="red"
 *   onConfirm            → fired after click; we DO NOT auto-close so the
 *                          caller can choose async behaviour. Wrap with
 *                          onOpenChange(false) at the call site if desired.
 *
 * Recipe convention (matches Modal.tsx):
 *   1. Chakra Dialog.* parts as base — no raw HTML.
 *   2. Semantic tokens only (bg.elevated, fg.default, fg.muted, …).
 *   3. a11y: role="alertdialog" via Dialog `role="alertdialog"`, focus trap +
 *      Escape dismiss handled by Chakra/Ark, confirm button receives initial
 *      focus via Dialog.Content focus management.
 *   4. Interactive → 'use client'.
 *
 * Testability note (task-32 CRITICAL-2/3):
 *   - cancel button carries an explicit onClick={() => onOpenChange(false)} so
 *     unit tests (jsdom) can assert the callback without relying on Ark's
 *     document-level dismiss layer (Escape / outside-click), which is not
 *     exercised in jsdom.
 *   - confirm button carries data-tone={tone} so tests can assert the danger
 *     branch without relying on Chakra's hashed CSS class names.
 */
'use client'

import * as React from 'react'
import { Dialog, Portal, Button as ChakraButton, HStack } from '@chakra-ui/react'

export type ConfirmDialogTone = 'default' | 'danger'

export interface ConfirmDialogProps {
  /** Whether the dialog is visible. Controlled. */
  open: boolean
  /** Called when the dialog requests to be closed (Escape / backdrop / cancel). */
  onOpenChange: (open: boolean) => void
  /** Dialog heading (e.g. "ボットを削除しますか?"). */
  title: string
  /** Dialog body — string or React node (e.g. with a <strong> highlight). */
  message: React.ReactNode
  /** Label for the confirm button. Defaults to "確認". */
  confirmLabel?: string
  /** Label for the cancel button. Defaults to "キャンセル". */
  cancelLabel?: string
  /**
   * Tone of the confirm action. `danger` turns the confirm button red and
   * sets role="alertdialog" on the surface.
   */
  tone?: ConfirmDialogTone
  /**
   * Called when the user clicks the confirm button. Does NOT auto-close —
   * the caller is responsible for calling `onOpenChange(false)` after the
   * underlying mutation succeeds (or eagerly, if optimistic).
   */
  onConfirm: () => void
  /** Disable confirm button (e.g. while async action is in-flight). */
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = '確認',
  cancelLabel = 'キャンセル',
  tone = 'default',
  onConfirm,
  loading = false,
}: ConfirmDialogProps): React.ReactElement {
  const isDanger = tone === 'danger'

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      placement="center"
      role="alertdialog"
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
            maxW="28rem"
          >
            <Dialog.Header p="0" mb="2">
              <Dialog.Title
                fontSize="lg"
                fontWeight="semibold"
                color="fg.default"
              >
                {title}
              </Dialog.Title>
            </Dialog.Header>

            <Dialog.Description
              fontSize="sm"
              color="fg.muted"
              mb="6"
              lineHeight="normal"
            >
              {message}
            </Dialog.Description>

            <Dialog.Footer p="0" mt="0">
              <HStack gap="2" justify="flex-end" w="full">
                <Dialog.CloseTrigger asChild>
                  <ChakraButton
                    type="button"
                    variant="outline"
                    bg="transparent"
                    color="fg.default"
                    borderColor="border.strong"
                    _hover={{ bg: 'bg.sunken' }}
                    disabled={loading}
                    onClick={() => onOpenChange(false)}
                  >
                    {cancelLabel}
                  </ChakraButton>
                </Dialog.CloseTrigger>
                <ChakraButton
                  type="button"
                  onClick={onConfirm}
                  disabled={loading}
                  colorPalette={isDanger ? 'red' : undefined}
                  data-tone={tone}
                  bg={isDanger ? 'status.danger' : 'accent.default'}
                  color="white"
                  _hover={{
                    bg: isDanger ? 'status.danger' : 'accent.hover',
                    opacity: 0.9,
                  }}
                  _disabled={{
                    pointerEvents: 'none',
                    opacity: 0.5,
                  }}
                >
                  {confirmLabel}
                </ChakraButton>
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

ConfirmDialog.displayName = 'ConfirmDialog'
