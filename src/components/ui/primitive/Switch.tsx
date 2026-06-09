/**
 * Switch — Chakra UI v3 (Phase 2 migration)
 * Recipe convention: same pattern as Button.tsx.
 *
 * Chakra v3 Switch uses SwitchRoot + SwitchControl + SwitchThumb + SwitchLabel
 * + SwitchHiddenInput. The role="switch" + aria-checked is managed by Ark UI
 * internally — no manual aria attributes needed.
 *
 * Public API preserved:
 *   checked, defaultChecked, onCheckedChange, label, size, disabled, id
 */
'use client'

import * as React from 'react'
import {
  SwitchRoot,
  SwitchControl,
  SwitchThumb,
  SwitchLabel,
  SwitchHiddenInput,
} from '@chakra-ui/react'

export interface SwitchProps {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  label?: string
  size?: 'sm' | 'md'
  disabled?: boolean
  id?: string
}

export function Switch({
  checked,
  defaultChecked,
  onCheckedChange,
  label,
  size = 'md',
  disabled = false,
  id,
}: SwitchProps) {
  const generatedId = React.useId()
  const switchId = id ?? generatedId

  // Size dimensions matching the old implementation exactly
  const trackW = size === 'sm' ? '9' : '11'
  const trackH = size === 'sm' ? '5' : '6'
  const thumbW = size === 'sm' ? '4' : '5'
  const thumbH = size === 'sm' ? '4' : '5'

  return (
    <SwitchRoot
      id={switchId}
      checked={checked}
      defaultChecked={defaultChecked}
      onCheckedChange={(details) => onCheckedChange?.(details.checked)}
      disabled={disabled}
      display="flex"
      alignItems="center"
      gap="2"
    >
      <SwitchHiddenInput />
      <SwitchControl
        width={trackW}
        height={trackH}
        borderRadius="full"
        bg="border.default"
        border="2px solid transparent"
        transition="background 200ms"
        cursor="pointer"
        _checked={{ bg: 'accent.default' }}
        _disabled={{ pointerEvents: 'none', opacity: 0.5 }}
        _focusVisible={{
          outline: '2px solid',
          outlineColor: 'border.strong',
          outlineOffset: '2px',
        }}
      >
        <SwitchThumb
          width={thumbW}
          height={thumbH}
          borderRadius="full"
          bg="white"
          boxShadow="sm"
          transition="transform 200ms"
        />
      </SwitchControl>

      {label && (
        <SwitchLabel
          color="fg.default"
          fontSize="md"
          cursor="pointer"
          userSelect="none"
          _disabled={{ pointerEvents: 'none', opacity: 0.5 }}
        >
          {label}
        </SwitchLabel>
      )}
    </SwitchRoot>
  )
}

Switch.displayName = 'Switch'
