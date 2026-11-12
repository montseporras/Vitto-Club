import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

type AdminPanelProps = {
  title: string
  /** Texto corto debajo del título. */
  subtitle?: string
  /** Algo al lado del título (ej. la etiqueta de estado del detalle de un consumo). */
  titleSuffix?: ReactNode
  /** Botones a la derecha del título (ej. "+ Crear recompensa"). */
  actions?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Recuadro de las pantallas del menú de Administración (ajustes S5-56, modelo: Auditoría).
 * Llega hasta abajo de la pantalla: alto mínimo = ventana − encabezado (4 rem) − 64 px.
 */
export function AdminPanel({
  title,
  subtitle,
  titleSuffix,
  actions,
  children,
  className,
}: AdminPanelProps) {
  return (
    <section
      className={cn(
        'flex min-h-[calc(100svh-8rem)] w-full flex-col rounded-[18px] border border-[#f0d9c4] bg-white p-[22px] shadow-[0_10px_24px_-18px_rgba(122,58,29,0.45)]',
        className,
      )}
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <h2 className="text-xl leading-tight font-extrabold text-[#5a2a14]">{title}</h2>
            {titleSuffix}
          </div>
          {subtitle && <p className="text-[13px] text-[#7a6e63]">{subtitle}</p>}
        </div>
        {actions}
      </header>

      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  )
}
