'use client'

/**
 * Chakra UI v3 Provider — App Router wiring
 *
 * - ChakraProvider receives the custom Linear token system
 * - ThemeProvider (next-themes) manages color mode with attribute="class"
 *   which sets .light/.dark class on <html> (next-themes idiomatic).
 * - Chakra v3 _dark condition resolves against .dark class selector,
 *   so attribute="class" is required for _dark tokens to apply correctly.
 * - tokens.css uses :root,.light / .dark selectors to match next-themes output.
 * - defaultTheme="light" aligns with tokens.css :root,.light selectors.
 * - disableTransitionOnChange prevents FOUC flash on theme switch.
 *
 * Reference: sandbox/next-app/app/provider.tsx (Chakra official template)
 * Fix history: 0e7fdd9 set attribute="data-theme" (structural mismatch with
 *   Chakra v3 _dark .dark class expectation) → reverted to attribute="class".
 */

import { ChakraProvider } from '@chakra-ui/react'
import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'
import { system } from './system'

interface ChakraAppProviderProps {
  children: ReactNode
}

export function ChakraAppProvider({ children }: ChakraAppProviderProps) {
  return (
    <ChakraProvider value={system}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </ChakraProvider>
  )
}
