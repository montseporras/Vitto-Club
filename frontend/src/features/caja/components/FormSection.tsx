import type { ReactNode } from 'react'

type FormSectionProps = {
  step: number
  title: string
  children: ReactNode
}

/** Bloque del formulario con número y título, para ubicarse rápido en caja. */
export function FormSection({ step, title, children }: FormSectionProps) {
  return (
    <fieldset className="mt-7 first:mt-0">
      <legend className="mb-4 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-8 place-items-center rounded-full bg-accent font-heading text-base font-bold text-ink"
        >
          {step}
        </span>
        <span className="font-heading text-xl font-bold text-accent-800">
          {title}
        </span>
      </legend>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}
