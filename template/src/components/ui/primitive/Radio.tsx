/**
 * RadioGroup — Chakra UI v3 (Phase 2 migration)
 * Recipe convention: same pattern as Button.tsx.
 *
 * Chakra v3 RadioGroup uses RadioGroupRoot + RadioGroupItem + RadioGroupItemControl
 * + RadioGroupItemText + RadioGroupItemHiddenInput.
 *
 * Public API preserved:
 *   value, onValueChange, items (RadioItem[]), name, error, disabled
 */
'use client'

import * as React from 'react'
import {
  RadioGroupRoot,
  RadioGroupItem,
  RadioGroupItemControl,
  RadioGroupItemText,
  RadioGroupItemHiddenInput,
  Field,
} from '@chakra-ui/react'

export interface RadioItem {
  value: string
  label: string
  disabled?: boolean
}

export interface RadioGroupProps {
  value?: string
  onValueChange?: (value: string) => void
  items: RadioItem[]
  name: string
  error?: string
  disabled?: boolean
}

export function RadioGroup({
  value,
  onValueChange,
  items,
  name,
  error,
  disabled = false,
}: RadioGroupProps) {
  return (
    <Field.Root invalid={!!error} gap="1">
      <RadioGroupRoot
        value={value}
        onValueChange={(details) => {
          if (details.value !== null) onValueChange?.(details.value)
        }}
        name={name}
        disabled={disabled}
        display="flex"
        flexDirection="column"
        gap="2"
      >
        {items.map((item) => (
          <RadioGroupItem
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            display="flex"
            alignItems="center"
            gap="2"
            cursor="pointer"
            _disabled={{ pointerEvents: 'none', opacity: 0.5 }}
          >
            <RadioGroupItemHiddenInput />
            <RadioGroupItemControl
              width="4"
              height="4"
              borderRadius="full"
              borderColor={error ? 'status.danger' : 'border.strong'}
              _checked={{ borderColor: 'accent.default' }}
              _focusVisible={{
                outline: '2px solid',
                outlineColor: 'border.strong',
                outlineOffset: '2px',
              }}
            />
            <RadioGroupItemText
              color="fg.default"
              fontSize="md"
              userSelect="none"
            >
              {item.label}
            </RadioGroupItemText>
          </RadioGroupItem>
        ))}
      </RadioGroupRoot>

      {error && (
        <Field.ErrorText color="status.danger" fontSize="sm">
          {error}
        </Field.ErrorText>
      )}
    </Field.Root>
  )
}

RadioGroup.displayName = 'RadioGroup'
