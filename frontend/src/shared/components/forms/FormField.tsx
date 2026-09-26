import type { ReactNode } from 'react'
import { Label } from '@/shared/components/ui/Label'

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
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {optional && (
          <span className="ml-1.5 text-xs font-normal text-neutral-600">
            (opcional)
          </span>
        )}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-accent-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-neutral-600">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
