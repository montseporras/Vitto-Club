import type { ReactNode } from 'react'
import { formSectionStyles } from '@/styles/ui'

type FormSectionProps = {
  /** Ya no se muestra (el título pasó a mayúsculas + línea); se mantiene para no tocar cada pantalla que la usa. */
  step?: number
  title: string
  children: ReactNode
}

/** Bloque del formulario, con título en mayúsculas para ubicarse rápido. */
export function FormSection({ title, children }: Readonly<FormSectionProps>) {
  return (
    <fieldset className={formSectionStyles.root}>
      <legend className={formSectionStyles.legend}>
        <span className={formSectionStyles.title}>{title}</span>
      </legend>
      <div className={formSectionStyles.grid}>{children}</div>
    </fieldset>
  )
}
