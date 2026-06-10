/**
 * Input — Chakra UI v3 (Phase 2 migration)
 *
 * Recipe convention: same pattern as Button.tsx.
 * - Uses Chakra Field.Root for label/hint/error wiring (aria-* automatic).
 * - prefix/suffix slots use Chakra InputGroup + InputElement.
 * - Preserves exact API: label, hint, error, prefix, suffix props.
 */
'use client'

import * as React from 'react'
import {
  Field,
  Input as ChakraInput,
  InputGroup,
} from '@chakra-ui/react'

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'suffix'> {
  label?: string
  hint?: string
  error?: string
  prefix?: React.ReactNode
  suffix?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, prefix, suffix, id, size, ...rest }, ref) => {
    const generatedId = React.useId()
    const inputId = id ?? generatedId

    return (
      <Field.Root
        invalid={!!error}
        id={inputId}
        gap="1"
      >
        {label && (
          <Field.Label
            color="fg.default"
            fontSize="sm"
            fontWeight="medium"
          >
            {label}
          </Field.Label>
        )}

        <InputGroup
          startElement={prefix ?? undefined}
          endElement={suffix ?? undefined}
          width="full"
        >
          <ChakraInput
            ref={ref}
            htmlSize={size}
            bg="bg.sunken"
            color="fg.default"
            borderColor={error ? 'status.danger' : 'border.default'}
            borderRadius="md"
            fontSize="md"
            _placeholder={{ color: 'fg.subtle' }}
            _focus={{
              borderColor: error ? 'status.danger' : 'border.strong',
              boxShadow: error
                ? '0 0 0 2px var(--colors-status-danger)'
                : '0 0 0 2px var(--colors-border-strong)',
            }}
            _disabled={{ pointerEvents: 'none', opacity: 0.5 }}
            {...rest}
          />
        </InputGroup>

        {hint && !error && (
          <Field.HelperText color="fg.muted" fontSize="sm">
            {hint}
          </Field.HelperText>
        )}

        {error && (
          <Field.ErrorText color="status.danger" fontSize="sm">
            {error}
          </Field.ErrorText>
        )}
      </Field.Root>
    )
  }
)

Input.displayName = 'Input'
