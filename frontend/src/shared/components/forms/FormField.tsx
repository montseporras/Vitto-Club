import type { ReactNode } from 'react'
import { Label } from '@/shared/components/ui/Label'

type FormFieldProps = {
  id: string
  label: string
  error?: string
  hint?: string
  children: ReactNode
}

/** Etiqueta + control + mensaje de error o ayuda debajo. */
export function FormField({ id, label, error, hint, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-accent-700">
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
