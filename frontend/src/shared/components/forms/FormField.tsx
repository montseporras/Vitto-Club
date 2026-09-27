import type { ReactNode } from 'react'
import { Label } from '@/shared/components/ui/Label'
import { formFieldStyles } from '@/styles/ui'

type FormFieldProps = {
  id: string
  label: string
  error?: string
  hint?: string
  optional?: boolean
  children: ReactNode
}

/** Etiqueta + control + mensaje de error o ayuda debajo. */
export function FormField({
  id,
  label,
  error,
  hint,
  optional,
  children,
}: FormFieldProps) {
  return (
    <div className={formFieldStyles.root}>
      <Label htmlFor={id}>
        {label}
        {optional && (
          <span className={formFieldStyles.optional}>(opcional)</span>
        )}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className={formFieldStyles.error}>
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className={formFieldStyles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}
