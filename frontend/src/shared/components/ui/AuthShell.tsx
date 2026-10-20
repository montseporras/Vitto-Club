import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'
import { authShellStyles } from '@/styles/ui'

type AuthShellProps = {
  title: string
  /** Texto corto arriba del formulario, a la derecha (ej. qué se logra al registrarse). */
  description?: string
  children: ReactNode
  className?: string
}

/** Pantalla de ingreso/registro: panel de marca a la izquierda + formulario a la derecha. */
export function AuthShell({
  title,
  description,
  children,
  className,
}: Readonly<AuthShellProps>) {
  return (
    <div className={cn(authShellStyles.root, className)}>
      <div className={authShellStyles.left}>
        <p className={authShellStyles.eyebrow}>Vitto Club</p>
        <h1 className={authShellStyles.title}>{title}</h1>
        <p className={authShellStyles.tagline}>Sabores de casa, todos los días</p>
      </div>
      <div className={authShellStyles.right}>
        {description && (
          <p className="mb-5 max-w-prose text-sm text-neutral-700">
            {description}
          </p>
        )}
        {children}
      </div>
    </div>
  )
}
