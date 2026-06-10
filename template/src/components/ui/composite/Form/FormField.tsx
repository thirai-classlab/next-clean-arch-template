/**
 * FormField — Chakra UI v3 (Phase 3 composite migration, Batch 2)
 *
 * Re-implemented presentation layer on top of Chakra v3 `Field.*` (was raw
 * <div>/<label>/<p> + Tailwind classes). The RHF integration (Pattern B) is
 * unchanged: FormField reads RHF's formState.errors, registers the child, and
 * propagates aria-invalid / aria-describedby / aria-required to the child via
 * React.cloneElement.
 *
 * Recipe convention (see primitive/Input.tsx + theme/system.ts):
 *   1. Use Chakra Field.* parts for label/hint/error chrome — no raw HTML.
 *   2. Apply Linear-theme semantic tokens via style props (fg.default,
 *      fg.muted, status.danger) — no hardcoded oklch/hex, no cva/className.
 *   3. Keep the exported TypeScript API (FormFieldProps, the FormField named
 *      export, Pattern B aria-* propagation) identical so consumers (dev page,
 *      admin gallery) compile unchanged.
 *
 * Note on Pattern B: the child (e.g. our primitive <Input>, which renders its
 * own Field.Root) keeps owning its input box; FormField never renders the
 * label/error twice. FormField's own Field.Root drives the label/hint/error
 * chrome and explicitly forwards aria-* to the child for the cases where the
 * child is a bare control. Explicit ids are kept (not Field auto-ids) so the
 * htmlFor / aria-describedby contract is byte-stable across the migration.
 */
'use client'

import * as React from 'react'
import { Field } from '@chakra-ui/react'
import { useFormContext, get, type FieldValues } from 'react-hook-form'

export interface FormFieldProps {
  name: string
  label?: string
  hint?: string
  /**
   * Explicit error message. If omitted, FormField reads from
   * React Hook Form's `formState.errors[name]` automatically.
   */
  error?: string
  required?: boolean
  children: React.ReactElement
}

/**
 * FormField (Pattern B): primitive 現状維持の wrapper。
 *
 * - label/hint/error の表示は FormField が一元管理 (Chakra Field.* で描画)
 * - children (Input/Textarea/Select) には `{...register(name)}` 相当を期待
 * - `aria-invalid` / `aria-describedby` を React.cloneElement で children に伝播
 * - children 側で error/label を **明示しない** こと (重複表示回避)
 *
 * 参照: docs/draft/07_component-library.md §「[M-01] Phase B 着手前の方針確定」
 */
export function FormField({
  name,
  label,
  hint,
  error: explicitError,
  required,
  children,
}: FormFieldProps): React.ReactElement {
  const ctx = useFormContext<FieldValues>()
  const generatedId = React.useId()
  const fieldId = `${name}-${generatedId}`
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errorId = `${fieldId}-error`

  // RHF state lookup (optional — FormField is usable outside <Form> with explicit error)
  const rhfError = ctx ? (get(ctx.formState.errors, name)?.message as string | undefined) : undefined
  const error = explicitError ?? rhfError
  const hasError = Boolean(error)

  // N-01 fix: only include hintId when hint is actually rendered in the DOM
  // (hint element is hidden when hasError is true, so its id must not appear
  // in aria-describedby — otherwise axe-core flags it as a dangling reference).
  const describedBy =
    [!hasError && hint ? hintId : null, hasError ? errorId : null]
      .filter(Boolean)
      .join(' ') || undefined

  // Register the child input with RHF (if context available)
  const registerProps = ctx ? ctx.register(name) : {}

  const child = React.cloneElement(children, {
    id: fieldId,
    name,
    'aria-invalid': hasError ? 'true' : undefined,
    'aria-describedby': describedBy,
    'aria-required': required ? 'true' : undefined,
    ...registerProps,
    ...children.props, // child-explicit props win (escape hatch)
  })

  return (
    <Field.Root invalid={hasError} required={required} gap="1">
      {label && (
        <Field.Label htmlFor={fieldId} color="fg.default" fontSize="sm" fontWeight="medium">
          {label}
          {required && (
            <Field.RequiredIndicator
              fallback={null}
              aria-hidden="true"
              color="status.danger"
              data-testid="required-indicator"
            >
              *
            </Field.RequiredIndicator>
          )}
        </Field.Label>
      )}

      {child}

      {hint && !hasError && (
        <Field.HelperText id={hintId} color="fg.muted" fontSize="sm">
          {hint}
        </Field.HelperText>
      )}

      {hasError && (
        <Field.ErrorText id={errorId} role="alert" color="status.danger" fontSize="sm">
          {error}
        </Field.ErrorText>
      )}
    </Field.Root>
  )
}
