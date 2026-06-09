import * as React from 'react'
import { cleanup } from '@testing-library/react'
import { afterEach, describe, it, expect } from 'vitest'
// Inline now renders Chakra v3 `HStack`, which reads the token system from a
// ChakraProvider in context. renderWithChakra supplies it.
import { renderWithChakra as render } from '@/test-utils'
import { Inline, GAP_TOKEN } from './Inline'
import type { InlineGap } from './Inline'

afterEach(() => {
  cleanup()
})

// ---------------------------------------------------------------------------
// Pure mapping unit tests — verify GAP_TOKEN directly so a bug like
// gap=24→'8' (wrong) vs gap=24→'6' (correct) is caught without relying on
// Chakra's CSS class generation or jsdom style resolution.
// ---------------------------------------------------------------------------
describe('Inline mapping tables (pure unit)', () => {
  it('GAP_TOKEN maps every supported px value to the correct spacing token key', () => {
    const expected: Array<[InlineGap, string]> = [
      [4, '1'],
      [8, '2'],
      [12, '3'],
      [16, '4'],
      [24, '6'],
      [32, '8'],
    ]
    for (const [px, token] of expected) {
      expect(GAP_TOKEN[px]).toBe(token)
    }
  })

  it('GAP_TOKEN covers all 6 InlineGap values', () => {
    expect(Object.keys(GAP_TOKEN)).toHaveLength(6)
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
describe('Inline', () => {
  it('renders with row direction (data attribute)', () => {
    const { container } = render(<Inline>a</Inline>)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveAttribute('data-direction', 'row')
  })

  it('accepts the full token-aligned gap scale without error', () => {
    for (const gap of [4, 8, 12, 16, 24, 32] as const) {
      const { container, unmount } = render(<Inline gap={gap}>a</Inline>)
      expect(container.firstChild).toBeInTheDocument()
      unmount()
    }
  })

  it('applies wrap by default (data-wrap="true")', () => {
    const { container } = render(<Inline>a</Inline>)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveAttribute('data-wrap', 'true')
  })

  it('disables wrap when wrap={false}', () => {
    const { container } = render(<Inline wrap={false}>a</Inline>)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveAttribute('data-wrap', 'false')
  })

  it('applies align="baseline"', () => {
    const { container } = render(<Inline align="baseline">a</Inline>)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveAttribute('data-align', 'baseline')
  })

  it('applies justify="between"', () => {
    const { container } = render(<Inline justify="between">a</Inline>)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveAttribute('data-justify', 'between')
  })

  it('omits data-align when align is not provided', () => {
    const { container } = render(<Inline>a</Inline>)
    const el = container.firstChild as HTMLElement
    expect(el).not.toHaveAttribute('data-align', 'baseline')
  })

  it('omits data-justify when justify is not provided', () => {
    const { container } = render(<Inline>a</Inline>)
    const el = container.firstChild as HTMLElement
    expect(el).not.toHaveAttribute('data-justify', 'between')
  })

  it('renders polymorphic root element via as prop', () => {
    const { container } = render(<Inline as="nav">a</Inline>)
    expect(container.firstChild?.nodeName).toBe('NAV')
  })

  it('forwards children content', () => {
    const { getByText } = render(<Inline>Hello Inline</Inline>)
    expect(getByText('Hello Inline')).toBeInTheDocument()
  })

  it('passes className through to the rendered node', () => {
    const { container } = render(<Inline className="my-inline">a</Inline>)
    expect(container.querySelector('.my-inline')).not.toBeNull()
  })
})
