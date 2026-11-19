import type { ReactNode } from 'react'
import { Label } from '@/shared/components/ui/Label'
import { formFieldStyles } from '@/styles/ui'

type FormFieldProps = {
  id: string
  label: string
  error?: string
  hint?: string
  optional?: boolean
  /**
   * Sin efecto: los obligatorios ya no llevan asterisco. Como casi todos los campos son
   * obligatorios, solo se marcan los opcionales con "(opcional)", para no llenar la pantalla de
   * marcas. Queda por compatibilidad con las pantallas que lo pasan.
   */
  hideRequiredMark?: boolean
  /** Reglas que se muestran antes de escribir (ej. requisitos de la contraseña). */
  rules?: ReactNode
  children: ReactNode
}

/** Etiqueta + control + mensaje de error o ayuda debajo. */
export function FormField({ id, label, error, hint, optional, rules, children }: FormFieldProps) {
  return (
    <div className={formFieldStyles.root}>
      <Label htmlFor={id} id={`${id}-label`}>
        {label}
        {optional && <span className={formFieldStyles.optional}>(opcional)</span>}
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
      {rules}
    </div>
  )
}
