/**
 * Heading tests — Phase 5 (behavior + a11y, no Tailwind/raw-var assertions)
 *
 * Chakra v3 renders via emotion-generated class names and CSS variables, so we
 * no longer assert on literal `text-Nxl` classes or `style.color = var(...)`.
 * We assert the observable contract: semantic tag, `as` override, id anchor,
 * className merge, children, and a11y.
 */
import { describe, it, expect } from 'vitest'
import { axe } from 'vitest-axe'
import { renderWithChakra } from '@/test-utils'
import { Heading } from './Heading'

describe('Heading', () => {
  describe('polymorphic API — level prop maps to semantic tag', () => {
    const levels = [1, 2, 3, 4, 5, 6] as const
    for (const level of levels) {
      it(`level={${level}} renders <h${level}>`, () => {
        const { container } = renderWithChakra(
          <Heading level={level}>Title</Heading>
        )
        expect(container.querySelector(`h${level}`)).not.toBeNull()
      })
    }
  })

  describe('polymorphic API — as prop overrides visual tag', () => {
    it('level={1} as="div" renders <div> not <h1>', () => {
      const { container } = renderWithChakra(
        <Heading level={1} as="div">Title</Heading>
      )
      expect(container.querySelector('div')).not.toBeNull()
      expect(container.querySelector('h1')).toBeNull()
    })

    it('level={2} as="p" renders <p>', () => {
      const { container } = renderWithChakra(
        <Heading level={2} as="p">Subtitle</Heading>
      )
      expect(container.querySelector('p')).not.toBeNull()
      expect(container.querySelector('h2')).toBeNull()
    })

    it('level={3} as="span" renders <span>', () => {
      const { container } = renderWithChakra(
        <Heading level={3} as="span">Label</Heading>
      )
      expect(container.querySelector('span')).not.toBeNull()
    })
  })

  describe('color variant — renders without error for each value', () => {
    const colors = ['default', 'muted', 'accent'] as const
    for (const color of colors) {
      it(`color="${color}" renders the heading`, () => {
        const { container } = renderWithChakra(
          <Heading level={1} color={color}>Title</Heading>
        )
        expect(container.querySelector('h1')?.textContent).toBe('Title')
      })
    }

    it('color prop omitted renders (defaults to fg.default)', () => {
      const { container } = renderWithChakra(<Heading level={1}>No color prop</Heading>)
      expect(container.querySelector('h1')).not.toBeNull()
    })
  })

  it('passes id prop for anchor support', () => {
    const { container } = renderWithChakra(
      <Heading level={2} id="section-intro">Intro</Heading>
    )
    expect(container.querySelector('#section-intro')).not.toBeNull()
  })

  it('merges custom className', () => {
    const { container } = renderWithChakra(
      <Heading level={1} className="custom-cls">Title</Heading>
    )
    const el = container.querySelector('h1') as HTMLElement
    expect(el.className).toContain('custom-cls')
  })

  it('renders children text', () => {
    const { container } = renderWithChakra(<Heading level={1}>Hello World</Heading>)
    expect(container.querySelector('h1')?.textContent).toBe('Hello World')
  })

  it('has no axe accessibility violations', async () => {
    const { container } = renderWithChakra(<Heading level={1}>Accessible Heading</Heading>)
    expect(await axe(container)).toHaveNoViolations()
  })
})
