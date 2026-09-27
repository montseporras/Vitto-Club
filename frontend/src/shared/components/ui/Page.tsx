import type { ComponentProps, ReactNode } from 'react'
import logoIso from '@/assets/logo-vitto-iso-white.png'
import { cn } from '@/shared/lib/utils'
import {
  pageCardBodyStyles,
  pageCardEyebrowStyles,
  pageCardHeaderStyles,
  pageCardLogoStyles,
  pageCardStyles,
  pageCardTitleStyles,
  pageStyles,
} from '@/styles/ui'

/** Contenedor de una pantalla: centra el contenido (alertas + PageCard). */
export function Page({ className, ...props }: ComponentProps<'section'>) {
  return <section className={cn(pageStyles, className)} {...props} />
}

type PageCardProps = {
  eyebrow: string
  title: string
  children: ReactNode
  className?: string
}

/** Tarjeta principal de una pantalla: encabezado naranja con el isologo y cuerpo. */
export function PageCard({ eyebrow, title, children, className }: PageCardProps) {
  return (
    <div className={cn(pageCardStyles, className)}>
      <header className={pageCardHeaderStyles}>
        <img
          src={logoIso}
          alt=""
          aria-hidden="true"
          className={pageCardLogoStyles}
        />
        <p className={pageCardEyebrowStyles}>{eyebrow}</p>
        <h2 className={pageCardTitleStyles}>{title}</h2>
      </header>

      <div className={pageCardBodyStyles}>{children}</div>
    </div>
  )
}
