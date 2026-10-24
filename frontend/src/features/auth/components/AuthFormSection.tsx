// Bloque del formulario de registro con el estilo del prototipo v2: título en
// la fuente de títulos, línea debajo y campos en columnas que se acomodan solas.
import type { ReactNode } from 'react'
import { authFormStyles } from '@/styles/ui'

type AuthFormSectionProps = {
  title: string
  children: ReactNode
}

export function AuthFormSection({ title, children }: Readonly<AuthFormSectionProps>) {
  return (
    <fieldset className={authFormStyles.section}>
      <legend className={authFormStyles.legend}>
        <span className={authFormStyles.title}>{title}</span>
      </legend>
      <div className={authFormStyles.grid}>{children}</div>
    </fieldset>
  )
}
