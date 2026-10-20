import type { ReactNode } from 'react'
import logoIso from '@/assets/logo-vitto-iso-white.png'
import { cn } from '@/shared/lib/utils'
import { authShellStyles } from '@/styles/ui'

type AuthShellProps = {
  title: string
  /** Texto corto en el panel de marca, debajo del lema (ej. qué se logra al registrarse). */
  description?: string
  /** 'wide' (por defecto): panel al 60 %, para el ingreso. 'narrow': al 38 %, para el registro. */
  panel?: 'wide' | 'narrow'
  children: ReactNode
  className?: string
}

/** Pantalla de ingreso/registro: panel de marca a la izquierda + formulario a la derecha, a pantalla completa. */
export function AuthShell({
  title,
  description,
  panel = 'wide',
  children,
  className,
}: Readonly<AuthShellProps>) {
  return (
    <div className={cn(authShellStyles.root, className)}>
      <div
        className={cn(
          authShellStyles.left,
          panel === 'narrow' ? authShellStyles.leftNarrow : authShellStyles.leftWide,
        )}
      >
        <img src={logoIso} alt="" aria-hidden="true" className={authShellStyles.logo} />
        <p className={authShellStyles.eyebrow}>Vitto Club</p>
        <h1 className={authShellStyles.title}>{title}</h1>
        <p className={authShellStyles.tagline}>Sabores de casa, todos los días</p>
        {description && (
          <p className={authShellStyles.description}>{description}</p>
        )}
      </div>
      <div className={authShellStyles.right}>{children}</div>
    </div>
  )
}
