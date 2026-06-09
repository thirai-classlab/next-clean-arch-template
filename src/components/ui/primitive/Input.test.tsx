/**
 * Input tests — Phase 2 (behavior + a11y, no className assertions)
 */
import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { axe } from 'vitest-axe'
import { renderWithChakra } from '@/test-utils'
import { Input } from './Input'
import { Search } from 'lucide-react'

describe('Input', () => {
  describe('label rendering', () => {
    it('renders label text when provided', () => {
      renderWithChakra(<Input label="Email address" />)
      expect(screen.getByText('Email address')).toBeTruthy()
    })

    it('renders a textbox element', () => {
      renderWithChakra(<Input label="Email" />)
      expect(screen.getByRole('textbox')).toBeTruthy()
    })

    it('does not render label element when label prop is omitted', () => {
      const { container } = renderWithChakra(<Input />)
      expect(container.querySelector('label')).toBeNull()
    })
  })

  describe('error state', () => {
    it('sets aria-invalid="true" on the input when error is provided', () => {
      renderWithChakra(<Input error="Required field" />)
      expect(screen.getByRole('textbox').getAttribute('aria-invalid')).toBe('true')
    })

    it('does not set aria-invalid=true when no error', () => {
      renderWithChakra(<Input />)
      const val = screen.getByRole('textbox').getAttribute('aria-invalid')
      expect(val === null || val === 'false').toBe(true)
    })

    it('renders the error message text', () => {
      renderWithChakra(<Input error="Invalid email" />)
      expect(screen.getByText('Invalid email')).toBeTruthy()
    })
  })

  describe('hint', () => {
    it('renders hint text when provided', () => {
      renderWithChakra(<Input hint="Must be a valid email" />)
      expect(screen.getByText('Must be a valid email')).toBeTruthy()
    })

    it('hides hint when error is provided (error takes priority)', () => {
      renderWithChakra(<Input hint="Some hint" error="Error msg" />)
      expect(screen.queryByText('Some hint')).toBeNull()
      expect(screen.getByText('Error msg')).toBeTruthy()
    })
  })

  describe('prefix / suffix', () => {
    it('renders prefix element', () => {
      renderWithChakra(<Input prefix={<Search data-testid="prefix-icon" size={16} />} />)
      expect(screen.getByTestId('prefix-icon')).toBeTruthy()
    })

    it('renders suffix element', () => {
      renderWithChakra(<Input suffix={<span data-testid="suffix-el">units</span>} />)
      expect(screen.getByTestId('suffix-el')).toBeTruthy()
    })
  })

  it('has no axe violations (with label)', async () => {
    const { container } = renderWithChakra(<Input label="Email address" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations (error state)', async () => {
    const { container } = renderWithChakra(<Input label="Email" error="Invalid email" />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
