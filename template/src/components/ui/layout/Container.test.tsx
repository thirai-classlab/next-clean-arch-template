import * as React from 'react'
import { cleanup } from '@testing-library/react'
import { afterEach, describe, it, expect } from 'vitest'
// Container now renders Chakra v3 `Container`, which reads the token system from
// a ChakraProvider in context. renderWithChakra supplies it.
import { renderWithChakra as render } from '@/test-utils'
import { Container, MAX_WIDTH_PX } from './Container'
import type { ContainerMaxWidth } from './Container'

afterEach(() => {
  cleanup()
})

// ---------------------------------------------------------------------------
// Pure mapping unit tests — verify the MAX_WIDTH_PX map directly so a bug
// like sm→'320px' (wrong) vs sm→'640px' (correct) is caught without relying
// on Chakra's CSS class generation or jsdom style resolution.
// ---------------------------------------------------------------------------
describe('Container mapping tables (pure unit)', () => {
  it('MAX_WIDTH_PX maps every supported key to the correct pixel value', () => {
    const expected: Array<[ContainerMaxWidth, string]> = [
      ['sm', '640px'],
      ['md', '768px'],
      ['lg', '1024px'],
      ['xl', '1280px'],
      ['2xl', '1536px'],
      ['full', '100%'],
    ]
    for (const [key, px] of expected) {
      expect(MAX_WIDTH_PX[key]).toBe(px)
    }
  })

  it('MAX_WIDTH_PX covers all 6 ContainerMaxWidth values', () => {
    const keys = Object.keys(MAX_WIDTH_PX)
    expect(keys).toHaveLength(6)
  })
})

// ---------------------------------------------------------------------------
// Render / DOM contract tests
// ---------------------------------------------------------------------------
describe('Container', () => {
  it('defaults to max-width "lg"', () => {
    const { container } = render(<Container>content</Container>)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveAttribute('data-max-width', 'lg')
  })

  it('reflects every maxWidth value via data attribute', () => {
    for (const mw of ['sm', 'md', 'lg', 'xl', '2xl', 'full'] as const) {
      const { container, unmount } = render(
        <Container maxWidth={mw}>content</Container>
      )
      const el = container.firstChild as HTMLElement
      expect(el).toHaveAttribute('data-max-width', mw)
      unmount()
    }
  })

  it('applies default padding="md"', () => {
    const { container } = render(<Container>content</Container>)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveAttribute('data-padding', 'md')
  })

  it('applies padding="none"', () => {
    const { container } = render(<Container padding="none">content</Container>)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveAttribute('data-padding', 'none')
  })

  it('renders polymorphic root via as prop', () => {
    const { container } = render(<Container as="main">content</Container>)
    expect(container.firstChild?.nodeName).toBe('MAIN')
  })

  it('forwards children content', () => {
    const { getByText } = render(<Container>Hello Container</Container>)
    expect(getByText('Hello Container')).toBeInTheDocument()
  })

  it('passes className through to the rendered node', () => {
    const { container } = render(
      <Container className="my-container">content</Container>
    )
    expect(container.querySelector('.my-container')).not.toBeNull()
  })
})
