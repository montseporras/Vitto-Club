import type { ReactNode } from 'react'
import { formSectionStyles } from '@/styles/ui'

type FormSectionProps = {
  step: number
  title: string
  children: ReactNode
}

/** Bloque del formulario con número y título, para ubicarse rápido. */
export function FormSection({ step, title, children }: FormSectionProps) {
  return (
    <fieldset className={formSectionStyles.root}>
      <legend className={formSectionStyles.legend}>
        <span aria-hidden="true" className={formSectionStyles.step}>
          {step}
        </span>
        <span className={formSectionStyles.title}>{title}</span>
      </legend>
      <div className={formSectionStyles.grid}>{children}</div>
    </fieldset>
  )
}
