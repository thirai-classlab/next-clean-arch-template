'use client'

/**
 * Toast — Chakra UI v3 (Phase 4 feedback migration)
 *
 * Re-implemented on top of Chakra v3 `createToaster` + `Toaster` (was sonner).
 * The exported TypeScript API is kept identical so every consumer compiles
 * unchanged:
 *   - useToast() → { success, error, info, warning }
 *   - Toaster    → component mounted once in app/layout.tsx
 *   - ToastApi / ToastOptions types
 *
 * Recipe convention (see primitive/Button.tsx + composite/Modal.tsx):
 *   1. Use Chakra Toast.* parts as the rendering base — no sonner.
 *   2. Apply Linear-theme semantic tokens via style props (bg.elevated,
 *      fg.default, fg.muted, border.default) — no hardcoded oklch/hex.
 *   3. a11y (aria-live region, focus management) is delegated to Chakra/Ark.
 *   4. Interactive + module-scoped toaster store → 'use client'.
 *
 * NOTE: sonner is still listed in package.json; its removal is deferred to
 * Phase 7 (dependency cleanup). This module no longer imports it.
 */

import * as React from 'react'
import {
  Toaster as ChakraToaster,
  Toast,
  Portal,
  Stack,
  createToaster,
} from '@chakra-ui/react'

/**
 * Optional metadata forwarded to the underlying toaster. We intentionally keep
 * this loose (record of unknowns) rather than re-exporting Chakra's internal
 * option types, because the public option surface consumers use is a small
 * subset (description, duration, action, etc.) that may legitimately be
 * extended without us re-typing it here.
 *
 * Recognised keys mapped onto Chakra's `toaster.create`:
 *   - description: string  → toast body line under the title
 *   - duration: number     → auto-dismiss delay (ms); omit for the default
 */
export type ToastOptions = Record<string, unknown>

export interface ToastApi {
  success: (message: string, options?: ToastOptions) => void
  error: (message: string, options?: ToastOptions) => void
  info: (message: string, options?: ToastOptions) => void
  warning: (message: string, options?: ToastOptions) => void
}

/**
 * Module-scoped toaster store. `createToaster` returns a stable singleton that
 * the <Toaster /> component (mounted once in the root layout) subscribes to.
 */
const toaster = createToaster({
  placement: 'bottom-end',
  pauseOnPageIdle: true,
})

type ToastType = 'success' | 'error' | 'info' | 'warning'

/**
 * Build the `toaster.create` payload from a message + loose options object.
 * `description` and `duration` are lifted out of the options bag when present;
 * any other recognised Chakra create-option keys are forwarded as-is.
 */
function buildToast(
  type: ToastType,
  message: string,
  options?: ToastOptions
): Parameters<typeof toaster.create>[0] {
  const { description, duration, ...rest } = (options ?? {}) as {
    description?: React.ReactNode
    duration?: number
  } & Record<string, unknown>

  return {
    type,
    title: message,
    closable: true,
    ...(description !== undefined ? { description } : {}),
    ...(duration !== undefined ? { duration } : {}),
    ...rest,
  }
}

/**
 * Stable, module-scoped delegator instance. The hook returns the same
 * reference on every render so consumers can safely place it inside
 * dependency arrays without triggering effects.
 */
const toastApi: ToastApi = Object.freeze({
  success: (message: string, options?: ToastOptions) =>
    toaster.create(buildToast('success', message, options)),
  error: (message: string, options?: ToastOptions) =>
    toaster.create(buildToast('error', message, options)),
  info: (message: string, options?: ToastOptions) =>
    toaster.create(buildToast('info', message, options)),
  warning: (message: string, options?: ToastOptions) =>
    toaster.create(buildToast('warning', message, options)),
})

/**
 * useToast — thin wrapper around Chakra's toaster exposing the four semantic
 * variants we use across the POC. The root layout mounts a single
 * `<Toaster />` (exported below) which renders all toasts.
 *
 * The returned object is stable across renders.
 */
export function useToast(): ToastApi {
  return toastApi
}

// Per-type accent for the toast indicator/border, via semantic tokens.
const TYPE_ACCENT: Record<string, string> = {
  success: 'status.success',
  error: 'status.danger',
  warning: 'status.warning',
  info: 'accent.default',
}

/**
 * Toaster — the single render surface for all toasts. Mount once in
 * `app/layout.tsx`:
 *
 * ```tsx
 * <Toaster />
 * ```
 *
 * Takes no props (the old sonner `richColors` / `closeButton` props are no
 * longer needed — rich colors come from the Linear tokens below and a close
 * trigger is rendered per toast).
 */
export function Toaster(): React.ReactElement {
  return (
    <Portal>
      <ChakraToaster toaster={toaster} insetInline={{ mdDown: '4' }}>
        {(toast) => (
          <Toast.Root
            width={{ md: 'sm' }}
            bg="bg.elevated"
            color="fg.default"
            borderWidth="1px"
            borderColor="border.default"
            borderRadius="md"
            boxShadow="lg"
          >
            <Toast.Indicator color={TYPE_ACCENT[toast.type ?? 'info']} />
            <Stack gap="1" flex="1" maxWidth="100%">
              {toast.title ? (
                <Toast.Title fontWeight="semibold" color="fg.default">
                  {toast.title}
                </Toast.Title>
              ) : null}
              {toast.description ? (
                <Toast.Description color="fg.muted">
                  {toast.description}
                </Toast.Description>
              ) : null}
            </Stack>
            {toast.action ? (
              <Toast.ActionTrigger>{toast.action.label}</Toast.ActionTrigger>
            ) : null}
            {toast.closable ? <Toast.CloseTrigger /> : null}
          </Toast.Root>
        )}
      </ChakraToaster>
    </Portal>
  )
}

Toaster.displayName = 'Toaster'
