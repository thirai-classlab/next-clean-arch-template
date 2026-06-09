/**
 * Text tests — Phase 5 (behavior + a11y, no Tailwind/raw-var assertions)
 *
 * Chakra v3 renders via emotion class names + CSS vars, so size/weight/color
 * are verified by "renders for each value" rather than literal class / style
 * string assertions. Tag selection and className merge remain observable.
 */
import { describe, it, expect } from 'vitest'
import { axe } from 'vitest-axe'
import { renderWithChakra } from '@/test-utils'
import { Text } from './Text'

describe('Text', () => {
  describe('default render', () => {
    it('renders as <p> by default', () => {
      const { container } = renderWithChakra(<Text>Hello</Text>)
      expect(container.querySelector('p')).not.toBeNull()
    })

    it('renders children text', () => {
      const { container } = renderWithChakra(<Text>Body copy</Text>)
      expect(container.querySelector('p')?.textContent).toBe('Body copy')
    })
  })

  describe('as prop', () => {
    it('as="span" renders <span>', () => {
      const { container } = renderWithChakra(<Text as="span">Inline</Text>)
      expect(container.querySelector('span')).not.toBeNull()
    })

    it('as="label" renders <label>', () => {
      const { container } = renderWithChakra(<Text as="label">Label</Text>)
      expect(container.querySelector('label')).not.toBeNull()
    })
  })

  describe('size variants — renders for each value', () => {
    const sizes = ['xs', 'sm', 'md', 'lg'] as const
    for (const size of sizes) {
      it(`size="${size}" renders the text`, () => {
        const { container } = renderWithChakra(<Text size={size}>{size}</Text>)
        expect(container.querySelector('p')?.textContent).toBe(size)
      })
    }
  })

  describe('weight variants — renders for each value', () => {
    const weights = ['regular', 'medium', 'semibold', 'bold'] as const
    for (const weight of weights) {
      it(`weight="${weight}" renders the text`, () => {
        const { container } = renderWithChakra(<Text weight={weight}>{weight}</Text>)
        expect(container.querySelector('p')?.textContent).toBe(weight)
      })
    }
  })

  describe('color variants — renders for each value', () => {
    const colors = ['default', 'muted', 'subtle', 'accent', 'danger'] as const
    for (const color of colors) {
      it(`color="${color}" renders the text`, () => {
        const { container } = renderWithChakra(<Text color={color}>{color}</Text>)
        expect(container.querySelector('p')?.textContent).toBe(color)
      })
    }
  })

  it('merges custom className', () => {
    const { container } = renderWithChakra(<Text className="my-custom">text</Text>)
    expect(container.querySelector('p')?.className).toContain('my-custom')
  })

  it('has no axe accessibility violations', async () => {
    const { container } = renderWithChakra(<Text>Accessible text content</Text>)
    expect(await axe(container)).toHaveNoViolations()
  })
})
