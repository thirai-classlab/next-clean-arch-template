/**
 * Select — Chakra UI v3 (Phase 2 migration)
 * Recipe convention: same pattern as Button.tsx.
 *
 * Uses Chakra NativeSelect (not the combobox Select) because the current API
 * accepts a flat options array and expects native listbox semantics — NativeSelect
 * is the direct Chakra equivalent. The combobox Select is reserved for Phase 3
 * composite work where typeahead / async search is needed.
 *
 * Public API preserved:
 *   options, value, onValueChange, placeholder, label, error, disabled, id
 */
'use client'

import * as React from 'react'
import {
  Field,
  NativeSelectRoot,
  NativeSelectField,
  NativeSelectIndicator,
} from '@chakra-ui/react'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  options: SelectOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
  id?: string
  'data-testid'?: string
}

export function Select({
  options,
  value,
  onValueChange,
  placeholder = 'Select an option',
  label,
  error,
  disabled = false,
  id,
  'data-testid': dataTestid,
}: SelectProps) {
  const generatedId = React.useId()
  const selectId = id ?? generatedId

  return (
    <Field.Root invalid={!!error} id={selectId} gap="1">
      {label && (
        <Field.Label color="fg.default" fontSize="sm" fontWeight="medium">
          {label}
        </Field.Label>
      )}

      <NativeSelectRoot disabled={disabled} size="md">
        <NativeSelectField
          id={selectId}
          value={value}
          // NativeSelectField forwards unknown DOM attributes to the underlying
          // <select>; `disabled` mirrors the root's disabled state so the native
          // control is genuinely non-interactive (NativeSelectRoot only styles it).
          {...({ disabled } as { disabled?: boolean })}
          {...(dataTestid !== undefined ? { 'data-testid': dataTestid } : {})}
          onChange={(e) => onValueChange?.(e.target.value)}
          bg="bg.sunken"
          color="fg.default"
          borderColor={error ? 'status.danger' : 'border.default'}
          borderRadius="md"
          fontSize="md"
          _disabled={{ pointerEvents: 'none', opacity: 0.5 }}
          _focus={{
            borderColor: error ? 'status.danger' : 'border.strong',
            boxShadow: error
              ? '0 0 0 2px var(--colors-status-danger)'
              : '0 0 0 2px var(--colors-border-strong)',
          }}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </NativeSelectField>
        <NativeSelectIndicator color="fg.muted" />
      </NativeSelectRoot>

      {error && (
        <Field.ErrorText color="status.danger" fontSize="sm">
          {error}
        </Field.ErrorText>
      )}
    </Field.Root>
  )
}

Select.displayName = 'Select'
