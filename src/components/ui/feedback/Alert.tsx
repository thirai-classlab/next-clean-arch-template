/**
 * Alert — Chakra UI v3 (Phase 4 feedback migration)
 *
 * Re-implemented on top of Chakra v3 `Alert` compound parts (was cva +
 * tailwind classes). The exported TypeScript API (AlertProps, the `Alert`
 * named export, the 4 variant names info/success/warning/danger) is kept
 * identical so every consumer compiles unchanged.
 *
 * Recipe convention (see primitive/Button.tsx + theme/system.ts):
 *   1. Use Chakra Alert.* parts as the rendering base — no raw <div>/cva.
 *   2. Apply Linear-theme semantic tokens via style props (status.*, fg.*,
 *      border.*, bg.*) — no hardcoded oklch/hex.
 *   3. a11y: role="alert" + aria-live (polite for info/success, assertive for
 *      warning/danger) + data-variant are preserved verbatim. The optional
 *      dismiss button (aria-label="閉じる") is kept.
 *   4. Alert itself is static, but the dismiss button is interactive → the
 *      whole module is rendered by client consumers; no 'use client' directive
 *      is required because the component has no hooks/effects of its own.
 *
 * Variant → Chakra status mapping:
 *   info → info, success → success, warning → warning, danger → error
 */

import * as React from 'react'
import { X } from 'lucide-react'
import { Alert as ChakraAlert, IconButton } from '@chakra-ui/react'

type AlertVariant = 'info' | 'success' | 'warning' | 'danger'

// Map our variant names to Chakra Alert status values (danger → error).
const STATUS_MAP: Record<AlertVariant, 'info' | 'success' | 'warning' | 'error'> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'error',
}

// Linear-theme border + bg + indicator color per variant, via semantic tokens.
const VARIANT_STYLE: Record<
  AlertVariant,
  { borderColor: string; bg: string; indicatorColor: string }
> = {
  info: {
    borderColor: 'accent.default',
    bg: 'accent.subtle',
    indicatorColor: 'accent.default',
  },
  success: {
    borderColor: 'status.success',
    bg: 'status.successSubtle',
    indicatorColor: 'status.success',
  },
  warning: {
    borderColor: 'status.warning',
    bg: 'status.warningSubtle',
    indicatorColor: 'status.warning',
  },
  danger: {
    borderColor: 'status.danger',
    bg: 'status.dangerSubtle',
    indicatorColor: 'status.danger',
  },
}

// success / info are non-urgent → polite (do not interrupt the screen reader)
// warning / danger are urgent → assertive (interrupt and announce)
const ARIA_LIVE: Record<AlertVariant, 'polite' | 'assertive'> = {
  info: 'polite',
  success: 'polite',
  warning: 'assertive',
  danger: 'assertive',
}

export interface AlertProps {
  variant?: AlertVariant
  title?: string
  /** When true, render an "閉じる" button and invoke `onDismiss` on click. */
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
  children?: React.ReactNode
}

/**
 * Alert — a static, role="alert" banner with 4 semantic variants.
 *
 * - role="alert" + aria-live (polite for info/success, assertive for warning/danger)
 * - Optional title rendered as an Alert.Title
 * - Optional dismiss button (aria-label="閉じる")
 *
 * No animations or focus management — this is a static surface. For
 * transient feedback, prefer `useToast()` from `./Toast`.
 */
export function Alert({
  variant = 'info',
  title,
  dismissible = false,
  onDismiss,
  className,
  children,
}: AlertProps): React.ReactElement {
  const style = VARIANT_STYLE[variant]

  return (
    <ChakraAlert.Root
      status={STATUS_MAP[variant]}
      role="alert"
      aria-live={ARIA_LIVE[variant]}
      data-variant={variant}
      className={className}
      display="flex"
      alignItems="flex-start"
      gap="3"
      borderRadius="md"
      borderWidth="1px"
      borderColor={style.borderColor}
      bg={style.bg}
      color="fg.default"
      px="4"
      py="3"
      fontSize="sm"
    >
      <ChakraAlert.Indicator color={style.indicatorColor} />
      <ChakraAlert.Content flex="1" gap="1">
        {title ? (
          <ChakraAlert.Title fontWeight="semibold">{title}</ChakraAlert.Title>
        ) : null}
        {children ? (
          <ChakraAlert.Description>{children}</ChakraAlert.Description>
        ) : null}
      </ChakraAlert.Content>
      {dismissible ? (
        <IconButton
          type="button"
          aria-label="閉じる"
          onClick={onDismiss}
          variant="ghost"
          size="xs"
          flexShrink={0}
          color="fg.muted"
          _hover={{ bg: 'bg.sunken', color: 'fg.default' }}
        >
          <X size={16} aria-hidden="true" />
        </IconButton>
      ) : null}
    </ChakraAlert.Root>
  )
}

Alert.displayName = 'Alert'
