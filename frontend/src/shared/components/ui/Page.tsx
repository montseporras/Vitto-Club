import type { ComponentProps, ReactNode } from 'react'
import logoIso from '@/assets/logo-vitto-iso-white.png'
import { cn } from '@/shared/lib/utils'
import {
  pageCardBodyStyles,
  pageCardDescriptionStyles,
  pageCardEyebrowStyles,
  pageCardHeaderStyles,
  pageCardLogoStyles,
  pageCardPlainDescriptionStyles,
  pageCardPlainTitleStyles,
  pageCardStyles,
  pageCardTitleStyles,
  pageStyles,
} from '@/styles/ui'

/** Contenedor de una pantalla: centra el contenido (alertas + PageCard). */
export function Page({ className, ...props }: ComponentProps<'section'>) {
  return <section className={cn(pageStyles, className)} {...props} />
}

type PageCardProps = {
  /** Título chico arriba del título. Opcional en 'plain'. */
  eyebrow?: string
  title: string
  /** Texto corto debajo del título. */
  description?: string
  /** 'header' (por defecto): tira clara con el título. 'plain': sin tira, título simple arriba del cuerpo. */
  variant?: 'header' | 'plain'
  children: ReactNode
  className?: string
}

/** Tarjeta principal de una pantalla: título arriba (con o sin tira de color) y cuerpo. */
export function PageCard({
  eyebrow,
  title,
  description,
  variant = 'header',
  children,
  className,
}: PageCardProps) {
  if (variant === 'plain') {
    return (
      <div className={cn(pageCardStyles, className)}>
        <div className={pageCardBodyStyles}>
          {eyebrow && <p className={pageCardEyebrowStyles}>{eyebrow}</p>}
          <h2 className={pageCardPlainTitleStyles}>{title}</h2>
          {description && (
            <p className={pageCardPlainDescriptionStyles}>{description}</p>
          )}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(pageCardStyles, className)}>
      <header className={pageCardHeaderStyles}>
        <img
          src={logoIso}
          alt=""
          aria-hidden="true"
          className={pageCardLogoStyles}
        />
        {eyebrow && <p className={pageCardEyebrowStyles}>{eyebrow}</p>}
        <h2 className={pageCardTitleStyles}>{title}</h2>
        {description && (
          <p className={pageCardDescriptionStyles}>{description}</p>
        )}
      </header>

      <div className={pageCardBodyStyles}>{children}</div>
    </div>
  )
}
