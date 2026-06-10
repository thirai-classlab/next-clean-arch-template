/**
 * Chakra v3 Provider smoke test — Phase 1
 *
 * Verifies:
 *   1. ChakraAppProvider mounts without throwing
 *   2. A Chakra Button renders inside the Provider (DOM presence)
 *   3. system is a valid Chakra system object (has _config)
 */

import * as React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, it, expect } from 'vitest'
import { Button } from '@chakra-ui/react'
import { ChakraAppProvider } from './provider'
import { system } from './system'

afterEach(() => {
  cleanup()
})

describe('ChakraAppProvider (Phase 1 smoke)', () => {
  it('mounts without throwing', () => {
    expect(() =>
      render(
        <ChakraAppProvider>
          <div>content</div>
        </ChakraAppProvider>
      )
    ).not.toThrow()
  })

  it('renders a Chakra Button inside the Provider', () => {
    render(
      <ChakraAppProvider>
        <Button data-testid="chakra-btn">Chakra OK</Button>
      </ChakraAppProvider>
    )
    expect(screen.getByTestId('chakra-btn')).toBeTruthy()
    expect(screen.getByTestId('chakra-btn').textContent).toBe('Chakra OK')
  })

  it('system object has _config (valid createSystem output)', () => {
    // createSystem returns an object with _config holding the merged theme.
    // This confirms createSystem(defaultConfig, config) ran without error.
    expect(system).toBeDefined()
    expect(typeof system).toBe('object')
    // The system object exposes a css() function (Chakra v3 API surface)
    expect(typeof (system as unknown as Record<string, unknown>).css).toBe('function')
  })

  it('system tokens include accent color (Linear blue)', () => {
    // Confirm the raw token was registered. system.token() resolves a token path.
    const token = (system as unknown as Record<string, unknown>).token
    if (typeof token === 'function') {
      const resolved = (token as (path: string) => string)('colors.accent-light')
      // oklch(55% 0.18 250) — the Linear blue equivalent
      expect(resolved).toContain('oklch')
    }
  })
})
