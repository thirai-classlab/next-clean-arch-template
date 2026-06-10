/**
 * Button tests — Phase 2 (behavior + a11y, no Tailwind className assertions)
 */
import { screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { renderWithChakra } from '@/test-utils'
import { Button } from './Button'
import { Mail } from 'lucide-react'

describe('Button', () => {
  describe('renders as a button element', () => {
    it('renders with role=button and visible text', () => {
      renderWithChakra(<Button>Click me</Button>)
      expect(screen.getByRole('button', { name: 'Click me' })).toBeTruthy()
    })

    it('renders each variant without error', () => {
      const variants = ['solid', 'outline', 'ghost', 'link'] as const
      for (const variant of variants) {
        const { unmount } = renderWithChakra(<Button variant={variant}>{variant}</Button>)
        expect(screen.getByRole('button', { name: variant })).toBeTruthy()
        unmount()
      }
    })

    it('renders each size without error', () => {
      const sizes = ['sm', 'md', 'lg'] as const
      for (const size of sizes) {
        const { unmount } = renderWithChakra(<Button size={size}>{size}</Button>)
        expect(screen.getByRole('button', { name: size })).toBeTruthy()
        unmount()
      }
    })
  })

  describe('loading state', () => {
    it('is disabled when loading=true', () => {
      renderWithChakra(<Button loading>Loading</Button>)
      expect(screen.getByRole('button')).toHaveProperty('disabled', true)
    })

    it('renders a spinner when loading=true', () => {
      const { container } = renderWithChakra(<Button loading>Loading</Button>)
      // Chakra v3 renders a <span class="chakra-spinner"> (not an svg) and marks
      // the button with data-loading while the loading prop is set.
      expect(container.querySelector('.chakra-spinner')).not.toBeNull()
      expect(container.querySelector('[data-loading]')).not.toBeNull()
    })

    it('does not render left icon when loading=true', () => {
      renderWithChakra(
        <Button loading icon={<Mail data-testid="mail-icon" />}>Send</Button>
      )
      expect(screen.queryByTestId('mail-icon')).toBeNull()
    })
  })

  describe('icon props', () => {
    it('renders left icon slot', () => {
      renderWithChakra(
        <Button icon={<span data-testid="left-icon">L</span>}>With Icon</Button>
      )
      expect(screen.getByTestId('left-icon')).toBeTruthy()
    })

    it('renders right icon slot', () => {
      renderWithChakra(
        <Button iconRight={<span data-testid="right-icon">R</span>}>With Icon</Button>
      )
      expect(screen.getByTestId('right-icon')).toBeTruthy()
    })

    it('does not render right icon when loading=true', () => {
      renderWithChakra(
        <Button loading iconRight={<span data-testid="right-icon">R</span>}>Loading</Button>
      )
      expect(screen.queryByTestId('right-icon')).toBeNull()
    })
  })

  describe('disabled state', () => {
    it('is disabled when disabled=true', () => {
      renderWithChakra(<Button disabled>Disabled</Button>)
      expect(screen.getByRole('button')).toHaveProperty('disabled', true)
    })

    it('does not fire onClick when disabled', () => {
      const handleClick = vi.fn()
      renderWithChakra(<Button disabled onClick={handleClick}>Disabled</Button>)
      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('click handler', () => {
    it('calls onClick when clicked', () => {
      const handleClick = vi.fn()
      renderWithChakra(<Button onClick={handleClick}>Click</Button>)
      fireEvent.click(screen.getByRole('button', { name: 'Click' }))
      expect(handleClick).toHaveBeenCalledOnce()
    })
  })

  describe('fullWidth', () => {
    it('renders fullWidth without error', () => {
      renderWithChakra(<Button fullWidth>Full</Button>)
      expect(screen.getByRole('button', { name: 'Full' })).toBeTruthy()
    })
  })

  it('has no axe violations (solid variant)', async () => {
    const { container } = renderWithChakra(<Button>Submit</Button>)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations (loading state)', async () => {
    const { container } = renderWithChakra(
      <Button loading aria-label="Submitting">Submit</Button>
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
