/**
 * Checkbox — Chakra UI v3 (Phase 2 migration)
 * Recipe convention: same pattern as Button.tsx.
 *
 * Chakra v3 Checkbox uses CheckboxRoot + CheckboxControl + CheckboxIndicator.
 * indeterminate maps to checked="indeterminate" on CheckboxRoot (Ark UI internal).
 * aria-checked="mixed" is set automatically by Chakra when checked="indeterminate".
 *
 * Public API preserved:
 *   checked, defaultChecked, onCheckedChange, label, error, indeterminate, disabled, id
 */
'use client'

import * as React from 'react'
import {
  CheckboxRoot,
  CheckboxControl,
  CheckboxIndicator,
  CheckboxLabel,
  CheckboxHiddenInput,
  Field,
} from '@chakra-ui/react'
import { Check, Minus } from 'lucide-react'

export interface CheckboxProps {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  label?: string
  error?: string
  indeterminate?: boolean
  disabled?: boolean
  id?: string
}

export function Checkbox({
  checked,
  defaultChecked,
  onCheckedChange,
  label,
  error,
  indeterminate = false,
  disabled = false,
  id,
}: CheckboxProps) {
  const generatedId = React.useId()
  const checkboxId = id ?? generatedId

  // Chakra / Ark UI accepts "indeterminate" as the checked value for aria-checked="mixed"
  const resolvedChecked: boolean | 'indeterminate' = indeterminate
    ? 'indeterminate'
    : (checked ?? false)

  return (
    <Field.Root invalid={!!error} gap="1">
      <CheckboxRoot
        id={checkboxId}
        checked={resolvedChecked}
        defaultChecked={defaultChecked}
        onCheckedChange={(details) => {
          if (typeof onCheckedChange === 'function') {
            onCheckedChange(details.checked === true)
          }
        }}
        disabled={disabled}
      >
        <CheckboxHiddenInput />
        <CheckboxControl
          bg="transparent"
          borderColor={error ? 'status.danger' : 'border.strong'}
          borderRadius="sm"
          width="4"
          height="4"
          _checked={{
            bg: 'accent.default',
            borderColor: 'accent.default',
            color: 'white',
          }}
          _indeterminate={{
            bg: 'accent.default',
            borderColor: 'accent.default',
            color: 'white',
          }}
          _disabled={{ pointerEvents: 'none', opacity: 0.5 }}
          _focusVisible={{
            outline: '2px solid',
            outlineColor: 'border.strong',
            outlineOffset: '2px',
          }}
        >
          <CheckboxIndicator>
            {indeterminate ? (
              <Minus size={10} strokeWidth={3} />
            ) : (
              <Check size={10} strokeWidth={3} />
            )}
          </CheckboxIndicator>
        </CheckboxControl>

        {label && (
          <CheckboxLabel
            color="fg.default"
            fontSize="md"
            cursor="pointer"
            userSelect="none"
            _disabled={{ pointerEvents: 'none', opacity: 0.5 }}
          >
            {label}
          </CheckboxLabel>
        )}
      </CheckboxRoot>

      {error && (
        <Field.ErrorText color="status.danger" fontSize="sm">
          {error}
        </Field.ErrorText>
      )}
    </Field.Root>
  )
}

Checkbox.displayName = 'Checkbox'
