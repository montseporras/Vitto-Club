import type { ReactNode } from 'react'
import logoIso from '@/assets/logo-vitto-iso-white.png'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { appFooterStyles, appHeaderStyles } from '@/styles/ui'

type AppHeaderProps = {
  /** Área de la app, al lado de la marca (ej. "Mostrador"). */
  area: string
  /** Acciones a la derecha (usuario, configuración, etc.). */
  children?: ReactNode
}

/** Barra superior naranja con volver, isologo y nombre del área. */
export function AppHeader({ area, children }: AppHeaderProps) {
  return (
    <header className={appHeaderStyles.root}>
      <div className={appHeaderStyles.inner}>
        {/* TODO: volver a la home cuando exista */}
        <button type="button" className={appHeaderStyles.back}>
          <Icon d={ICONS.arrowLeft} className="size-4" />
          Volver
        </button>

        <span aria-hidden="true" className={appHeaderStyles.divider} />

        <div className={appHeaderStyles.brand}>
          <img
            src={logoIso}
            alt=""
            width={171}
            height={225}
            className={appHeaderStyles.logo}
          />
          <h1 className={appHeaderStyles.title}>
            Vitto Club
            <span className={appHeaderStyles.area}> · {area}</span>
          </h1>
        </div>

        {children && <div className={appHeaderStyles.actions}>{children}</div>}
      </div>
    </header>
  )
}

/** Pie con la frase de la marca. */
export function AppFooter() {
  return (
    <footer className={appFooterStyles.root}>
      <p className={appFooterStyles.text}>Sabores de casa, todos los días</p>
    </footer>
  )
}
