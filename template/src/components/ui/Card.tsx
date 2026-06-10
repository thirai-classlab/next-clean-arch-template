/**
 * Card — Chakra UI v3 (Phase 2 migration)
 * Recipe convention: same pattern as Button.tsx.
 *
 * Uses Chakra CardRoot (the unstyled slot-recipe root) with semantic tokens.
 * The "pad" prop is preserved: pad=true applies the standard card padding,
 * pad=false lets the caller control internal layout (e.g. flush images).
 *
 * Public API preserved: children, style, pad
 */
import type { CSSProperties, ReactNode } from 'react'
import { CardRoot } from '@chakra-ui/react'

export interface CardProps {
  children: ReactNode
  style?: CSSProperties
  /** when false, removes padding (caller supplies its own). default true */
  pad?: boolean
}

export function Card({ children, style, pad = true }: CardProps) {
  return (
    <CardRoot
      bg="bg.elevated"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="lg"
      padding={pad ? '6' : '0'}
      boxShadow="sm"
      style={style}
      // override Chakra default variant bg so our token takes effect
      variant="outline"
    >
      {children}
    </CardRoot>
  )
}
