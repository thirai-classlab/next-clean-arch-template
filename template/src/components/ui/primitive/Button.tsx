/**
 * Button — Chakra UI v3 (Phase 2 migration)
 *
 * RECIPE CONVENTION (canonical pattern for Phases 3-5):
 *   1. Use the Chakra component as the rendering base — no raw <button>.
 *   2. Map our variant/size prop values to Chakra's built-in recipe variants.
 *      Chakra Button variants: solid | subtle | outline | surface | plain
 *      Our mapping: solid→solid, outline→outline, ghost→plain (no bg border),
 *      link→plain (text-only, p-0 override via style prop)
 *   3. Apply Linear-theme token overrides via `color`, `bg`, `borderColor` props
 *      using the semantic tokens from system.ts (accent.default, fg.default, etc.)
 *   4. Keep the exported TypeScript API identical to the old implementation
 *      so consuming code (admin pages, gallery) requires zero changes.
 *   5. Chakra interactive components require "use client" in App Router.
 *
 * See: apps/web/src/theme/recipes/README (Phase 2 recipe pattern docs)
 * See: apps/web/src/theme/system.ts (semantic token definitions)
 */
'use client'

import * as React from 'react'
import { Button as ChakraButton } from '@chakra-ui/react'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'outline' | 'ghost' | 'link'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
  fullWidth?: boolean
}

// Map our size names to Chakra Button sizes
const SIZE_MAP = { sm: 'sm', md: 'md', lg: 'lg' } as const

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'solid',
      size = 'md',
      loading = false,
      icon,
      iconRight,
      fullWidth = false,
      disabled,
      children,
      type = 'button',
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    // --- Variant → Chakra recipe variant + token overrides ---
    // solid: accent fill button (Linear #2A6FDB)
    // outline: border-only, transparent bg
    // ghost: no border, transparent bg (Chakra "plain" is closest)
    // link: text-only, no height constraint

    const variantProps = (() => {
      switch (variant) {
        case 'solid':
          return {
            variant: 'solid' as const,
            bg: 'accent.default',
            color: 'white',
            _hover: { bg: 'accent.hover' },
          }
        case 'outline':
          return {
            variant: 'outline' as const,
            bg: 'transparent',
            color: 'fg.default',
            borderColor: 'border.strong',
            _hover: { bg: 'bg.sunken' },
          }
        case 'ghost':
          return {
            variant: 'plain' as const,
            bg: 'transparent',
            color: 'fg.default',
            _hover: { bg: 'bg.sunken' },
          }
        case 'link':
          return {
            variant: 'plain' as const,
            bg: 'transparent',
            color: 'accent.text',
            px: 0,
            height: 'auto',
            _hover: { textDecoration: 'underline' },
          }
      }
    })()

    return (
      <ChakraButton
        ref={ref}
        size={SIZE_MAP[size]}
        loading={loading}
        disabled={isDisabled}
        width={fullWidth ? 'full' : undefined}
        type={type}
        fontFamily="sans"
        fontWeight="medium"
        borderRadius="md"
        transition="colors"
        _disabled={{ pointerEvents: 'none', opacity: 0.5 }}
        {...variantProps}
        {...rest}
      >
        {!loading && icon && <span aria-hidden="true">{icon}</span>}
        {children}
        {!loading && iconRight && <span aria-hidden="true">{iconRight}</span>}
      </ChakraButton>
    )
  }
)

Button.displayName = 'Button'
