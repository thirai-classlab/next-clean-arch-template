import * as React from 'react'
import {
  FormProvider,
  useForm,
  useFormContext,
  type FieldValues,
  type SubmitHandler,
  type UseFormProps,
  type UseFormReturn,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ZodSchema } from 'zod'

/**
 * FormField pattern decision: **Pattern B**
 *
 * Phase A primitive (Input/Textarea/Select) は既に error/label/hint を内蔵し 8 component PASS 済。
 * Pattern B は primitive 現状維持 + FormField を上位 wrapper として配置し、
 * children への aria-invalid / aria-describedby 伝播のみ FormField が担当する。
 *
 * 参照: docs/draft/07_component-library.md §「[M-01] Phase B 着手前の方針確定」L651
 */
export const FORM_FIELD_PATTERN = 'B' as const

export interface FormProps<T extends FieldValues>
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  schema?: ZodSchema<T>
  defaultValues?: UseFormProps<T>['defaultValues']
  onSubmit: SubmitHandler<T>
  children: React.ReactNode
}

export function Form<T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  children,
  ...formProps
}: FormProps<T>) {
  const methods = useForm<T>({
    ...(schema ? { resolver: zodResolver(schema) } : {}),
    ...(defaultValues ? { defaultValues } : {}),
  })

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} noValidate {...formProps}>
        {children}
      </form>
    </FormProvider>
  )
}

/**
 * Re-export RHF hook for consumer access (e.g. for programmatic reset).
 */
export function useForm$<T extends FieldValues>(): UseFormReturn<T> {
  return useFormContext<T>()
}
