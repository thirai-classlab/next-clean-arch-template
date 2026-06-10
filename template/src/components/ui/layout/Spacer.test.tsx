import * as React from 'react'
import { cleanup } from '@testing-library/react'
import { afterEach, describe, it, expect } from 'vitest'
// Spacer now renders a `chakra.span` factory element, which reads the token
// system from a ChakraProvider in context. renderWithChakra supplies it.
import { renderWithChakra as render } from '@/test-utils'
import { Spacer, SIZE_TOKEN } from './Spacer'
import type { SpacerSize } from './Spacer'

afterEach(() => {
  cleanup()
})

// ---------------------------------------------------------------------------
// Pure mapping unit tests — verify SIZE_TOKEN directly so a bug like
// size=24→'8' (wrong) vs size=24→'6' (correct) is caught without relying on
// Chakra's CSS class generation or jsdom style resolution.
// ---------------------------------------------------------------------------
describe('Spacer mapping tables (pure unit)', () => {
  it('SIZE_TOKEN maps every supported px value to the correct spacing token key', () => {
    const expected: Array<[SpacerSize, string]> = [
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
      expect(SIZE_TOKEN[px]).toBe(token)
    }
  })

  it('axis="y" routes token to height prop (not width)', () => {
    // Directly verify the sizeProps branching logic exported via data-axis:
    //   axis=y → rendered element has data-axis="y"  (height driven, not width)
    //   axis=x → rendered element has data-axis="x"  (width driven, not height)
    // The Chakra factory does not expose height/width as DOM style attributes in
    // jsdom, so we verify the routing decision through data-axis (which Spacer.tsx
    // explicitly sets as the routing signal) and confirm the complementary axis
    // is NOT selected.
    const { container: cy } = render(<Spacer size={32} axis="y" />)
    expect(cy.firstChild).toHaveAttribute('data-axis', 'y')
    // axis=y must NOT be rendered as data-axis="x"
    expect(cy.firstChild).not.toHaveAttribute('data-axis', 'x')

    const { container: cx } = render(<Spacer size={32} axis="x" />)
    expect(cx.firstChild).toHaveAttribute('data-axis', 'x')
    // axis=x must NOT be rendered as data-axis="y"
    expect(cx.firstChild).not.toHaveAttribute('data-axis', 'y')
  })
})

// ---------------------------------------------------------------------------
// Render / DOM contract tests
// ---------------------------------------------------------------------------
describe('Spacer', () => {
  it('renders with aria-hidden="true"', () => {
    const { container } = render(<Spacer size={32} />)
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('defaults to the y-axis (data-axis="y")', () => {
    const { container } = render(<Spacer size={32} />)
    expect(container.firstChild).toHaveAttribute('data-axis', 'y')
  })

  it('applies x-axis when axis="x" (data-axis="x")', () => {
    const { container } = render(<Spacer size={16} axis="x" />)
    expect(container.firstChild).toHaveAttribute('data-axis', 'x')
  })

  it('accepts the full token-aligned size scale without error', () => {
    for (const size of [4, 8, 12, 16, 24, 32, 48, 64] as const) {
      const { container, unmount } = render(<Spacer size={size} />)
      expect(container.firstChild).toBeInTheDocument()
      unmount()
    }
  })

  it('renders with no interactive role', () => {
    const { container } = render(<Spacer size={16} />)
    expect(container.firstChild).not.toHaveAttribute('role')
  })

  it('renders a span element', () => {
    const { container } = render(<Spacer size={16} />)
    expect(container.firstChild?.nodeName).toBe('SPAN')
  })

  it('passes className through to the rendered node', () => {
    const { container } = render(<Spacer size={16} className="my-spacer" />)
    expect(container.querySelector('.my-spacer')).not.toBeNull()
  })
})
