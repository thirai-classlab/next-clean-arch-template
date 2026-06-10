import { screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { renderWithChakra } from '@/test-utils'
import { Form, FormField } from './index'

/**
 * Form + FormField unit tests — Chakra v3 (Batch 2 migration, Pattern B).
 *
 * The RHF integration (zod resolver, register, handleSubmit) is unchanged; only
 * the presentation layer moved from raw <div>/<label>/<p> to Chakra `Field.*`.
 * Tests therefore still assert the *behavior + a11y contract* (aria-invalid,
 * aria-describedby, htmlFor, aria-required, hint/error exclusivity, submit
 * payload). FormField uses Chakra components internally, so every render is now
 * wrapped in ChakraProvider via renderWithChakra.
 */

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Form (composite, Pattern B)', () => {
  it('Test 1: FormField propagates aria-invalid="true" and aria-describedby={...-error} when error is non-empty', async () => {
    const schema = z.object({ email: z.string().email('invalid email') })

    renderWithChakra(
      <Form schema={schema} onSubmit={vi.fn()}>
        <FormField name="email" label="Email">
          <input type="text" data-testid="email-input" />
        </FormField>
        <button type="submit">Submit</button>
      </Form>
    )

    // Trigger validation
    fireEvent.click(screen.getByText('Submit'))

    await waitFor(() => {
      const input = screen.getByTestId('email-input') as HTMLInputElement
      expect(input.getAttribute('aria-invalid')).toBe('true')

      const describedBy = input.getAttribute('aria-describedby')
      expect(describedBy).toBeTruthy()
      expect(describedBy).toMatch(/-error$/)

      // Error element id matches aria-describedby
      const errorEl = screen.getByRole('alert')
      expect(errorEl.id).toBe(describedBy)
    })
  })

  it('Test 2: FormField links label to input via htmlFor; htmlFor matches input.id', () => {
    renderWithChakra(
      <Form onSubmit={vi.fn()}>
        <FormField name="username" label="Username">
          <input type="text" data-testid="username-input" />
        </FormField>
      </Form>
    )

    const label = screen.getByText('Username').closest('label') as HTMLLabelElement
    const input = screen.getByTestId('username-input') as HTMLInputElement

    expect(label).not.toBeNull()
    expect(label.htmlFor).toBe(input.id)
    expect(label.htmlFor.length).toBeGreaterThan(0)

    // Label-click focus binding (jsdom does not implement htmlFor click → focus,
    // so we verify the linkage attribute pair directly; browsers honour it natively).
    expect(label.getAttribute('for')).toBe(input.getAttribute('id'))
  })

  it('Test 3: Zod resolver renders validation error in FormField error slot on submit', async () => {
    const schema = z.object({
      age: z.number({ invalid_type_error: 'age must be a number' }).int().min(18, 'min 18'),
    })

    renderWithChakra(
      <Form schema={schema} onSubmit={vi.fn()}>
        <FormField name="age" label="Age">
          <input type="number" data-testid="age-input" />
        </FormField>
        <button type="submit">Submit</button>
      </Form>
    )

    fireEvent.click(screen.getByText('Submit'))

    await waitFor(() => {
      // RHF + Zod runs validation, FormField renders error message in role="alert"
      const errorEl = screen.getByRole('alert')
      expect(errorEl.textContent).toMatch(/age must be a number|min 18/)
    })
  })

  it('Test 4: required=true renders indicator (*) and propagates aria-required="true" to input', () => {
    renderWithChakra(
      <Form onSubmit={vi.fn()}>
        <FormField name="password" label="Password" required>
          <input type="password" data-testid="password-input" />
        </FormField>
      </Form>
    )

    // Visible indicator with textContent '*' (no className assertion — implementation detail)
    const indicator = screen.getByTestId('required-indicator')
    expect(indicator.textContent).toBe('*')
    expect(indicator.getAttribute('aria-hidden')).toBe('true')

    // aria-required must propagate to the input (a11y behavior)
    const input = screen.getByTestId('password-input') as HTMLInputElement
    expect(input.getAttribute('aria-required')).toBe('true')
  })

  it('Test 5: hint text is rendered and linked via aria-describedby={...-hint}', () => {
    renderWithChakra(
      <Form onSubmit={vi.fn()}>
        <FormField name="bio" label="Bio" hint="Max 200 characters">
          <input type="text" data-testid="bio-input" />
        </FormField>
      </Form>
    )

    // hint text visible
    const hintEl = screen.getByText('Max 200 characters')
    expect(hintEl).toBeTruthy()
    expect(hintEl.id).toMatch(/-hint$/)

    // aria-describedby on input includes the hint id
    const input = screen.getByTestId('bio-input') as HTMLInputElement
    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(describedBy!.split(' ')).toContain(hintEl.id)
  })

  it('Test 6: hint is hidden once an error is present (exclusivity)', async () => {
    const schema = z.object({ email: z.string().email('invalid email') })

    renderWithChakra(
      <Form schema={schema} onSubmit={vi.fn()}>
        <FormField name="email" label="Email" hint="We never share your email">
          <input type="text" data-testid="email-input" />
        </FormField>
        <button type="submit">Submit</button>
      </Form>
    )

    // hint visible before submit (no error yet)
    expect(screen.queryByText('We never share your email')).not.toBeNull()

    // Trigger validation
    fireEvent.click(screen.getByText('Submit'))

    await waitFor(() => {
      // After validation fails, error appears and hint is no longer rendered
      const errorEl = screen.getByRole('alert')
      expect(errorEl.textContent).toMatch(/invalid email/)
      expect(screen.queryByText('We never share your email')).toBeNull()
    })
  })

  it('Test 7: onSubmit happy path — valid data triggers callback exactly once with parsed payload', async () => {
    const schema = z.object({ name: z.string().min(1, 'required') })
    const handleSubmit = vi.fn()

    renderWithChakra(
      <Form schema={schema} defaultValues={{ name: 'ada' }} onSubmit={handleSubmit}>
        <FormField name="name" label="Name">
          <input type="text" data-testid="name-input" />
        </FormField>
        <button type="submit">Submit</button>
      </Form>
    )

    fireEvent.click(screen.getByText('Submit'))

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledTimes(1)
    })

    // First arg of first call is the parsed payload
    const [payload] = handleSubmit.mock.calls[0]
    expect(payload).toEqual({ name: 'ada' })
  })

  it('Test 8: useId-based field id is stable across re-renders (SSR-safe)', () => {
    const { rerender } = renderWithChakra(
      <Form onSubmit={vi.fn()}>
        <FormField name="city" label="City">
          <input type="text" data-testid="city-input" />
        </FormField>
      </Form>
    )

    const firstId = (screen.getByTestId('city-input') as HTMLInputElement).id
    expect(firstId.length).toBeGreaterThan(0)

    // Re-render with same children — id must remain stable (useId guarantee)
    rerender(
      <Form onSubmit={vi.fn()}>
        <FormField name="city" label="City">
          <input type="text" data-testid="city-input" />
        </FormField>
      </Form>
    )

    const secondId = (screen.getByTestId('city-input') as HTMLInputElement).id
    expect(secondId).toBe(firstId)

    // label htmlFor must also match the stable id
    const label = screen.getByText('City').closest('label') as HTMLLabelElement
    expect(label.htmlFor).toBe(secondId)
  })

  it('Test 9: aria-describedby contains only DOM-resolvable ids when error is present (no dangling hint id)', async () => {
    const schema = z.object({ email: z.string().email('invalid email') })

    renderWithChakra(
      <Form schema={schema} onSubmit={vi.fn()}>
        <FormField name="email" label="Email" hint="Enter your email">
          <input type="text" data-testid="email-input" />
        </FormField>
        <button type="submit">Submit</button>
      </Form>
    )

    fireEvent.click(screen.getByText('Submit'))

    await waitFor(() => {
      const input = screen.getByTestId('email-input') as HTMLInputElement
      const describedBy = input.getAttribute('aria-describedby')
      expect(describedBy).not.toBeNull()
      expect(describedBy!.length).toBeGreaterThan(0)

      // Every id in aria-describedby must resolve to a DOM element
      describedBy!.split(' ').forEach((id) => {
        expect(document.getElementById(id)).not.toBeNull()
      })

      // hint id must NOT appear (hint element is removed when error is shown)
      expect(describedBy).not.toMatch(/-hint$/)
      expect(describedBy).not.toMatch(/-hint\s/)
    })
  })
})
