/**
 * Select tests — Phase 2 (behavior + a11y, no className assertions)
 * Backed by NativeSelect (HTML <select>) — options-array API preserved.
 */
import { screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { renderWithChakra } from '@/test-utils'
import { Select } from './Select'

const OPTIONS = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry', disabled: true },
]

describe('Select', () => {
  describe('rendering', () => {
    it('renders a native select element', () => {
      const { container } = renderWithChakra(<Select options={OPTIONS} />)
      expect(container.querySelector('select')).not.toBeNull()
    })

    it('renders all option labels', () => {
      renderWithChakra(<Select options={OPTIONS} />)
      expect(screen.getByRole('option', { name: 'Apple' })).toBeTruthy()
      expect(screen.getByRole('option', { name: 'Banana' })).toBeTruthy()
      expect(screen.getByRole('option', { name: 'Cherry' })).toBeTruthy()
    })

    it('renders placeholder as a disabled option', () => {
      renderWithChakra(<Select options={OPTIONS} placeholder="Pick a fruit" />)
      const opt = screen.getByRole('option', { name: 'Pick a fruit' })
      expect(opt).toBeTruthy()
      expect(opt).toHaveProperty('disabled', true)
    })

    it('renders label when provided', () => {
      renderWithChakra(<Select options={OPTIONS} label="Fruit" />)
      expect(screen.getByText('Fruit')).toBeTruthy()
    })

    it('renders error message when provided', () => {
      renderWithChakra(<Select options={OPTIONS} error="Selection required" />)
      expect(screen.getByText('Selection required')).toBeTruthy()
    })
  })

  describe('value', () => {
    it('reflects the controlled value', () => {
      const { container } = renderWithChakra(<Select options={OPTIONS} value="apple" />)
      const select = container.querySelector('select') as HTMLSelectElement
      expect(select.value).toBe('apple')
    })
  })

  describe('disabled state', () => {
    it('disables the select when disabled=true', () => {
      const { container } = renderWithChakra(<Select options={OPTIONS} disabled />)
      expect((container.querySelector('select') as HTMLSelectElement).disabled).toBe(true)
    })
  })

  describe('onValueChange callback', () => {
    it('calls onValueChange when an option is selected', () => {
      const handleChange = vi.fn()
      const { container } = renderWithChakra(
        <Select options={OPTIONS} onValueChange={handleChange} />
      )
      fireEvent.change(container.querySelector('select')!, {
        target: { value: 'banana' },
      })
      expect(handleChange).toHaveBeenCalledWith('banana')
    })
  })

  describe('disabled option', () => {
    it('marks disabled option with disabled attribute', () => {
      renderWithChakra(<Select options={OPTIONS} />)
      expect(screen.getByRole('option', { name: 'Cherry' })).toHaveProperty('disabled', true)
    })
  })

  it('has no axe violations', async () => {
    const { container } = renderWithChakra(
      <Select options={OPTIONS} label="Fruit" placeholder="Pick a fruit" />
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
