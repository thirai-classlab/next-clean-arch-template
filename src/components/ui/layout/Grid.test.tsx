import * as React from 'react'
import { cleanup } from '@testing-library/react'
import { afterEach, describe, it, expect } from 'vitest'
// Grid now renders Chakra v3 `Grid`, which reads the token system from a
// ChakraProvider in context. renderWithChakra supplies it.
import { renderWithChakra as render } from '@/test-utils'
import { Grid, GAP_TOKEN, RESPONSIVE_MIN_COL_PX, buildTemplateColumns } from './Grid'
import type { GridGap, GridCols } from './Grid'

afterEach(() => {
  cleanup()
})

// ---------------------------------------------------------------------------
// Pure mapping unit tests — verify the token-mapping logic directly without
// depending on Chakra's CSS class generation or jsdom style resolution.
// These catch mapping bugs (e.g. gap=24 mapped to wrong token key) that the
// data-* attribute assertions below cannot detect.
// ---------------------------------------------------------------------------
describe('Grid mapping tables (pure unit)', () => {
  it('GAP_TOKEN maps every supported px value to the correct spacing token key', () => {
    const expected: Array<[GridGap, string]> = [
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

  it('buildTemplateColumns with responsive=true produces auto-fill/minmax string', () => {
    const result = buildTemplateColumns(true, 3)
    expect(result).toBe(
      `repeat(auto-fill, minmax(min(${RESPONSIVE_MIN_COL_PX}px, 100%), 1fr))`
    )
  })

  it('buildTemplateColumns with responsive=false produces fixed repeat(cols,...) string', () => {
    expect(buildTemplateColumns(false, 1)).toBe('repeat(1, minmax(0, 1fr))')
    expect(buildTemplateColumns(false, 3)).toBe('repeat(3, minmax(0, 1fr))')
    expect(buildTemplateColumns(false, 12)).toBe('repeat(12, minmax(0, 1fr))')
  })

  it('buildTemplateColumns responsive=true ignores cols argument', () => {
    // When responsive=true the cols prop is irrelevant — track count is
    // viewport-driven. Both calls must produce the same string.
    expect(buildTemplateColumns(true, 1)).toBe(buildTemplateColumns(true, 6))
  })

  it('RESPONSIVE_MIN_COL_PX is 280 (collapse threshold for narrow viewports)', () => {
    expect(RESPONSIVE_MIN_COL_PX).toBe(280)
  })
})

// ---------------------------------------------------------------------------
// Render / DOM contract tests — verify the component passes the correct props
// and attributes to the DOM, and renders the expected public-API behaviour.
// ---------------------------------------------------------------------------
describe('Grid (layout)', () => {
  it('applies cols=3 via data-cols attribute', () => {
    const { container } = render(<Grid cols={3}>cell</Grid>)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveAttribute('data-cols', '3')
  })

  it('accepts the full token-aligned gap scale without error', () => {
    for (const gap of [4, 8, 12, 16, 24, 32] as const) {
      const { container, unmount } = render(<Grid gap={gap}>cell</Grid>)
      expect(container.firstChild).toBeInTheDocument()
      unmount()
    }
  })

  it('defaults to cols=1', () => {
    const { container } = render(<Grid>cell</Grid>)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveAttribute('data-cols', '1')
  })

  it('is responsive by default (data-responsive="true")', () => {
    const { container } = render(<Grid cols={3}>cell</Grid>)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveAttribute('data-responsive', 'true')
  })

  it('disables responsive when responsive={false}', () => {
    const { container } = render(
      <Grid cols={3} responsive={false}>
        cell
      </Grid>
    )
    const el = container.firstChild as HTMLElement
    expect(el).toHaveAttribute('data-responsive', 'false')
  })

  it('forwards children content', () => {
    const { getByText } = render(<Grid>Hello Grid</Grid>)
    expect(getByText('Hello Grid')).toBeInTheDocument()
  })

  it('boundary cols values render the expected data-cols', () => {
    for (const cols of [1, 6, 12] as const) {
      const { container, unmount } = render(
        <Grid cols={cols} responsive={false}>
          cell
        </Grid>
      )
      const el = container.firstChild as HTMLElement
      expect(el).toHaveAttribute('data-cols', String(cols))
      expect(el).toHaveAttribute('data-responsive', 'false')
      unmount()
    }
  })

  it('renders polymorphic root element via as prop', () => {
    const { container } = render(<Grid as="section">cell</Grid>)
    expect(container.firstChild?.nodeName).toBe('SECTION')
  })

  it('passes className through to the rendered node', () => {
    const { container } = render(<Grid className="my-grid">cell</Grid>)
    expect(container.querySelector('.my-grid')).not.toBeNull()
  })
})
