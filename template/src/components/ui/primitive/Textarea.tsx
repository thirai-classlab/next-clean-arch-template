/**
 * Textarea — Chakra UI v3 (Phase 2 migration)
 * Recipe convention: same pattern as Button.tsx / Input.tsx.
 * autoResize: uses a manual height-adjustment effect (Chakra v3 has no built-in
 * autoresize, so we replicate the ref-merge + scrollHeight approach).
 */
'use client'

import * as React from 'react'
import { Field, Textarea as ChakraTextarea } from '@chakra-ui/react'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  autoResize?: boolean
  rows?: number
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { label, error, hint, autoResize = false, rows = 4, id, onChange, ...rest },
    ref
  ) => {
    const generatedId = React.useId()
    const textareaId = id ?? generatedId

    const internalRef = React.useRef<HTMLTextAreaElement | null>(null)

    const setRef = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        internalRef.current = node
        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          ;(ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node
        }
      },
      [ref]
    )

    const adjustHeight = React.useCallback(() => {
      const el = internalRef.current
      if (!el || !autoResize) return
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }, [autoResize])

    React.useEffect(() => {
      adjustHeight()
    }, [adjustHeight])

    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        adjustHeight()
        onChange?.(e)
      },
      [adjustHeight, onChange]
    )

    return (
      <Field.Root invalid={!!error} id={textareaId} gap="1">
        {label && (
          <Field.Label color="fg.default" fontSize="sm" fontWeight="medium">
            {label}
          </Field.Label>
        )}

        <ChakraTextarea
          ref={setRef}
          rows={rows}
          bg="bg.sunken"
          color="fg.default"
          borderColor={error ? 'status.danger' : 'border.default'}
          borderRadius="md"
          fontSize="md"
          resize="none"
          overflow={autoResize ? 'hidden' : undefined}
          _placeholder={{ color: 'fg.subtle' }}
          _focus={{
            borderColor: error ? 'status.danger' : 'border.strong',
            boxShadow: error
              ? '0 0 0 2px var(--colors-status-danger)'
              : '0 0 0 2px var(--colors-border-strong)',
          }}
          _disabled={{ pointerEvents: 'none', opacity: 0.5 }}
          onChange={handleChange}
          {...rest}
        />

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

Textarea.displayName = 'Textarea'
