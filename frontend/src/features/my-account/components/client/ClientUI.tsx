// Piezas de la vista del Cliente (diseño "App Fidelización V2"): título de pantalla, encabezado
// de sección, barra de progreso y pastilla de puntos.
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useSession } from '@/features/auth'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { formatInteger } from '@/shared/lib/numbers'
import { cn } from '@/shared/lib/utils'
import { clientStyles } from '@/styles/ui'
import { whatsappUrl } from '../../lib/contact'

/**
 * Encabezado de la pantalla: "Volver" (si la pantalla está adentro de otra), el título y, a la
 * derecha, "Consultas y reservas", que abre WhatsApp con un mensaje que ya trae el nombre. Una
 * línea lo separa del contenido.
 */
export function ClientPageHeader({ title, backTo }: { title: string; backTo?: string }) {
  const session = useSession()
  const firstName = session.status === 'authenticated' ? session.user.firstName : null

  return (
    <header className={clientStyles.header}>
      {backTo && (
        <Link to={backTo} aria-label="Volver" title="Volver" className={clientStyles.back}>
          <Icon d={ICONS.arrowLeft} className="size-6" />
        </Link>
      )}
      <h1 className={clientStyles.title}>{title}</h1>
      <a
        href={whatsappUrl(firstName)}
        target="_blank"
        rel="noreferrer"
        className={clientStyles.contact}
        aria-label="Consultas y reservas por WhatsApp"
      >
        <Icon d={ICONS.whatsapp} className="size-4 shrink-0 text-[#1e9e55]" />
        Consultas y reservas
      </a>
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
      <Icon d={icon} className="size-[55%]" />
    </span>
  )
}

/** Botón "Filtros" con ícono: abre y cierra el panel de filtros. Muestra cuántos hay activos. */
export function FiltersToggle({
  open,
  activeCount,
  controls,
  onToggle,
}: {
  open: boolean
  activeCount: number
  controls: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      onClick={onToggle}
      className={cn(
        'inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl border-2 px-3.5 text-sm font-bold transition-[background-color,border-color,transform] duration-150 active:scale-[0.97]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-700',
        open || activeCount > 0
          ? 'border-accent-700 bg-accent-700 text-white'
          : 'border-accent-200 bg-surface text-accent-800 hover:border-accent-400',
      )}
    >
      <Icon d={ICONS.sliders} className="size-5" />
      Filtros
      {activeCount > 0 && (
        <span className="grid size-5 place-items-center rounded-full bg-white text-xs text-accent-800">
          {activeCount}
        </span>
      )}
    </button>
  )
}
