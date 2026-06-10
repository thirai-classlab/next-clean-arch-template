/**
 * IconButton — Chakra UI v3 (Phase 2 migration)
 *
 * Recipe convention: same pattern as Button.tsx.
 * - aria-label is required (TypeScript enforced) — Chakra IconButton passes it through.
 * - icon prop accepts a Lucide component (ElementType), rendered at the right px size.
 * - variant/size maps identical to Button.
 */
'use client'

import * as React from 'react'
import { IconButton as ChakraIconButton } from '@chakra-ui/react'
import { Loader2 } from 'lucide-react'

const ICON_SIZE: Record<'sm' | 'md' | 'lg', number> = {
  sm: 16,
  md: 20,
  lg: 24,
}

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ElementType
  'aria-label': string
  variant?: 'solid' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon: Icon,
      variant = 'ghost',
      size = 'md',
      loading = false,
      disabled,
      type = 'button',
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading
    const iconPx = ICON_SIZE[size ?? 'md']

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
        default:
          return {
            variant: 'plain' as const,
            bg: 'transparent',
            color: 'fg.default',
            _hover: { bg: 'bg.sunken' },
          }
      }
    })()

    return (
      <ChakraIconButton
        ref={ref}
        size={size}
        disabled={isDisabled}
        type={type}
        borderRadius="md"
        _disabled={{ pointerEvents: 'none', opacity: 0.5 }}
        {...variantProps}
        {...rest}
      >
        {loading ? (
          <Loader2 size={iconPx} className="animate-spin" aria-hidden="true" />
        ) : (
          <Icon size={iconPx} aria-hidden="true" />
        )}
      </ChakraIconButton>
    )
  }
)

IconButton.displayName = 'IconButton'
