/**
 * Textarea tests — Phase 2 (behavior + a11y, no className assertions)
 */
import { screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { axe } from 'vitest-axe'
import { renderWithChakra } from '@/test-utils'
import { Textarea } from './Textarea'

describe('Textarea', () => {
  describe('label', () => {
    it('renders label text when provided', () => {
      renderWithChakra(<Textarea label="Comments" />)
      expect(screen.getByText('Comments')).toBeTruthy()
    })

    it('renders a textbox element', () => {
      renderWithChakra(<Textarea label="Comments" />)
      expect(screen.getByRole('textbox')).toBeTruthy()
    })

    it('does not render label when not provided', () => {
      const { container } = renderWithChakra(<Textarea />)
      expect(container.querySelector('label')).toBeNull()
    })
  })

  describe('error state', () => {
    it('sets aria-invalid="true" when error is provided', () => {
      renderWithChakra(<Textarea error="Too long" />)
      expect(screen.getByRole('textbox').getAttribute('aria-invalid')).toBe('true')
    })

    it('renders error message text', () => {
      renderWithChakra(<Textarea error="Too long" />)
      expect(screen.getByText('Too long')).toBeTruthy()
    })
  })

  describe('hint', () => {
    it('renders hint text when provided', () => {
      renderWithChakra(<Textarea hint="Max 500 characters" />)
      expect(screen.getByText('Max 500 characters')).toBeTruthy()
    })
  })

  describe('autoResize', () => {
    it('adjusts height on change when autoResize=true', () => {
      const { container } = renderWithChakra(<Textarea autoResize />)
      const textarea = container.querySelector('textarea') as HTMLTextAreaElement
      Object.defineProperty(textarea, 'scrollHeight', {
        value: 200,
        configurable: true,
      })
      fireEvent.change(textarea, { target: { value: 'Line 1\nLine 2\nLine 3' } })
      expect(textarea.style.height).toBe('200px')
    })
  })

  describe('rows', () => {
    it('applies default rows=4', () => {
      const { container } = renderWithChakra(<Textarea />)
      expect(container.querySelector('textarea')?.rows).toBe(4)
    })

    it('applies custom rows value', () => {
      const { container } = renderWithChakra(<Textarea rows={8} />)
      expect(container.querySelector('textarea')?.rows).toBe(8)
    })
  })

  it('has no axe violations (with label)', async () => {
    const { container } = renderWithChakra(<Textarea label="Comments" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations (error state)', async () => {
    const { container } = renderWithChakra(<Textarea label="Comments" error="Too long" />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
