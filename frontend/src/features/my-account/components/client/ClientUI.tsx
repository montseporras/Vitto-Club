// Piezas de la vista del Cliente (diseño "App Fidelización V2"): título de pantalla, encabezado
// de sección, barra de progreso y pastilla de puntos.
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { formatInteger } from '@/shared/lib/numbers'
import { cn } from '@/shared/lib/utils'
import { clientStyles } from '@/styles/ui'

/** Título centrado de la pantalla, con "Volver" a la izquierda si la pantalla está adentro de otra. */
export function ClientPageHeader({ title, backTo }: { title: string; backTo?: string }) {
  return (
    <header className={clientStyles.header}>
      {backTo && (
        <Link to={backTo} aria-label="Volver" title="Volver" className={clientStyles.back}>
          <Icon d={ICONS.arrowLeft} className="size-6" />
        </Link>
      )}
      <h1 className={clientStyles.title}>{title}</h1>
    </header>
  )
}

/** Encabezado de una sección: ícono, título y una acción a la derecha. */
export function SectionHeader({
  id,
  icon,
  title,
  action,
}: {
  id?: string
  icon: string
  title: string
  action?: ReactNode
}) {
  return (
    <div className={clientStyles.sectionHeader}>
      <Icon d={icon} className={clientStyles.sectionIcon} />
      <h2 id={id} className={clientStyles.sectionTitle}>
        {title}
      </h2>
      {action}
    </div>
  )
}

/** Pastilla de puntos: "250 pts". */
export function PointsPill({ points, className }: { points: number; className?: string }) {
  return <span className={cn(clientStyles.pill, className)}>{formatInteger(points)} pts</span>
}

/** Barra de progreso de 0 a 100 (el porcentaje lo manda el backend o sale de progreso / objetivo). */
export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  const value = Math.max(0, Math.min(100, Math.round(percent)))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className={clientStyles.track}
    >
      <div className={clientStyles.bar} style={{ width: `${value}%` }} />
    </div>
  )
}

/** Ícono redondo de una fila (taza, pizza, recibo…). */
export function RowIcon({ icon, className }: { icon: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('grid size-11 shrink-0 place-items-center rounded-xl bg-accent-100 text-accent-700', className)}
    >
      <Icon d={icon} className="size-6" />
    </span>
  )
}
