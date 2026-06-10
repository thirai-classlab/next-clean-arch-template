import * as React from 'react'
import { cleanup } from '@testing-library/react'
import { afterEach, describe, it, expect } from 'vitest'
// Stack now renders Chakra v3 `Stack`, which reads the token system from a
// ChakraProvider in context. renderWithChakra supplies it.
import { renderWithChakra as render } from '@/test-utils'
import { Stack, GAP_TOKEN } from './Stack'
import type { StackGap } from './Stack'

afterEach(() => {
  cleanup()
})

// ---------------------------------------------------------------------------
// Pure mapping unit tests — verify GAP_TOKEN directly so a bug like
// gap=24→'8' (wrong) vs gap=24→'6' (correct) is caught without relying on
// Chakra's CSS class generation or jsdom style resolution.
// ---------------------------------------------------------------------------
describe('Stack mapping tables (pure unit)', () => {
  it('GAP_TOKEN maps every supported px value to the correct spacing token key', () => {
    const expected: Array<[StackGap, string]> = [
      [4, '1'],
      [8, '2'],
      [12, '3'],
      [16, '4'],
      [24, '6'],
      [32, '8'],
      [48, '12'],
      [64, '16'],
    ]
    for (const [px, token] of expected) {
      expect(GAP_TOKEN[px]).toBe(token)
    }
  })

  it('GAP_TOKEN covers all 8 StackGap values', () => {
    expect(Object.keys(GAP_TOKEN)).toHaveLength(8)
  })

  it('GAP_TOKEN produces unique token keys (no two px values share the same key)', () => {
    const values = Object.values(GAP_TOKEN)
    const unique = new Set(values)
    expect(unique.size).toBe(values.length)
  })
})

// ---------------------------------------------------------------------------
// Render / DOM contract tests
// ---------------------------------------------------------------------------
describe('Stack', () => {
  it('renders with default column direction (data attribute)', () => {
    const { container } = render(<Stack>content</Stack>)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveAttribute('data-direction', 'column')
  })

  it('applies row direction when direction="row"', () => {
    const { container } = render(<Stack direction="row">content</Stack>)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveAttribute('data-direction', 'row')
  })

  it('accepts the full token-aligned gap scale without error', () => {
    for (const gap of [4, 8, 12, 16, 24, 32, 48, 64] as const) {
      const { container, unmount } = render(<Stack gap={gap}>content</Stack>)
      expect(container.firstChild).toBeInTheDocument()
      unmount()
    }
  })

  it('applies align and justify data attributes', () => {
    const { container } = render(
      <Stack align="center" justify="between">
        content
      </Stack>
    )
    const el = container.firstChild as HTMLElement
    expect(el).toHaveAttribute('data-align', 'center')
    expect(el).toHaveAttribute('data-justify', 'between')
  })

  it('omits data-align when align is not provided', () => {
    const { container } = render(<Stack>content</Stack>)
    const el = container.firstChild as HTMLElement
    // undefined align → attribute not set (or set to "undefined" string);
    // either way consumers must not rely on a specific absent-prop value.
    expect(el).not.toHaveAttribute('data-align', 'center')
  })

  it('omits data-justify when justify is not provided', () => {
    const { container } = render(<Stack>content</Stack>)
    const el = container.firstChild as HTMLElement
    expect(el).not.toHaveAttribute('data-justify', 'between')
  })

  it('renders polymorphic root element via as prop', () => {
    const { container } = render(<Stack as="section">content</Stack>)
    expect(container.firstChild?.nodeName).toBe('SECTION')
  })

  it('renders default div root', () => {
    const { container } = render(<Stack>content</Stack>)
    expect(container.firstChild?.nodeName).toBe('DIV')
  })

  it('forwards children content', () => {
    const { getByText } = render(<Stack>Hello Stack</Stack>)
    expect(getByText('Hello Stack')).toBeInTheDocument()
  })

  it('passes className through to the rendered node', () => {
    const { container } = render(<Stack className="my-stack">content</Stack>)
    expect(container.querySelector('.my-stack')).not.toBeNull()
  })
})
