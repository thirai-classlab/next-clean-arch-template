import * as React from 'react'
import { screen, cleanup } from '@testing-library/react'
import { afterEach, describe, it, expect } from 'vitest'
// Skeleton renders Chakra's skeleton recipe, which needs a ChakraProvider in
// context. renderWithChakra supplies it.
import { renderWithChakra as render } from '@/test-utils'
import { Skeleton, SkeletonText, SkeletonCircle } from './Skeleton'

afterEach(() => {
  cleanup()
})

describe('Skeleton', () => {
  it('renders a placeholder element', () => {
    render(<Skeleton data-testid="sk" width="100px" height="20px" />)
    expect(screen.getByTestId('sk')).toBeInTheDocument()
  })

  it('renders children inside the skeleton (loaded content slot)', () => {
    render(
      <Skeleton>
        <span data-testid="content">loaded</span>
      </Skeleton>
    )
    expect(screen.getByTestId('content')).toBeInTheDocument()
  })

  it('passes className through to the rendered node', () => {
    const { container } = render(<Skeleton className="my-skeleton" />)
    expect(container.querySelector('.my-skeleton')).not.toBeNull()
  })

  it('accepts the three variants without error', () => {
    for (const variant of ['pulse', 'shine', 'none'] as const) {
      const { unmount } = render(
        <Skeleton variant={variant} data-testid={`sk-${variant}`} />
      )
      expect(screen.getByTestId(`sk-${variant}`)).toBeInTheDocument()
      unmount()
    }
  })
})

describe('SkeletonText / SkeletonCircle re-exports', () => {
  it('renders SkeletonText with noOfLines=3 producing 3 skeleton nodes', () => {
    render(<SkeletonText data-testid="skt" noOfLines={3} />)
    // Chakra v3 SkeletonText spreads data-testid onto each generated line
    // element (verified by DOM inspection: container produces a wrapping
    // chakra-stack div containing N chakra-skeleton divs each carrying the
    // forwarded data-testid). This assertion is coupled to Chakra v3's current
    // rendering strategy; if a future Chakra version changes the structure,
    // this test should be updated to match the new DOM shape.
    expect(screen.getAllByTestId('skt')).toHaveLength(3)
  })

  it('renders SkeletonText without throwing (render contract)', () => {
    // Fallback render-without-error guard for the SkeletonText re-export,
    // independent of internal DOM structure.
    expect(() => render(<SkeletonText noOfLines={2} />)).not.toThrow()
  })

  it('renders SkeletonCircle', () => {
    render(<SkeletonCircle data-testid="skc" size="10" />)
    expect(screen.getByTestId('skc')).toBeInTheDocument()
  })
})
