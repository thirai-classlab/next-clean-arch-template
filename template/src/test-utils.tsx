/**
 * Shared test utilities — Phase 2+
 *
 * renderWithChakra wraps the component under test in ChakraProvider using the
 * project's Linear token system. Required for all Chakra v3 component tests
 * because Chakra reads the design token system from React context.
 *
 * Usage:
 *   import { renderWithChakra } from '@/test-utils'
 *   const { container } = renderWithChakra(<Button>Click</Button>)
 */
import type { ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { ChakraProvider } from '@chakra-ui/react'
import { system } from '@/theme/system'

function ChakraWrapper({ children }: { children: ReactNode }) {
  return <ChakraProvider value={system}>{children}</ChakraProvider>
}

export function renderWithChakra(
  ui: ReactNode,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: ChakraWrapper, ...options })
}

// Re-export everything from @testing-library/react for convenience
export * from '@testing-library/react'
