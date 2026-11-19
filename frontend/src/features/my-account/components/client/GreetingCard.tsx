// Tarjeta de bienvenida del Inicio (diseño V2): saludo, saldo para canjear y el nivel con su barra
// de progreso. Todo sale de GET /customers/me/puntos; no se calcula nada (§3.10.1).
import { Link } from 'react-router'
import { LEVELS, type Level } from '@/domain/levels'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { formatInteger } from '@/shared/lib/numbers'
import { cn } from '@/shared/lib/utils'
import { CUSTOMER_PATHS } from '../../lib/paths'
import type { CustomerPoints } from '../../types/customer-points'
import { ProgressBar } from './ClientUI'

// Medalla de cada nivel
const MEDALS: Record<Level, string> = {
  BRONZE: 'from-[#e3a87a] to-[#a8642f] text-white',
  SILVER: 'from-[#e9e9ea] to-[#9a9ca1] text-white',
  GOLD: 'from-[#f6d77a] to-[#c8961d] text-white',
}

export function LevelMedal({ level, className }: { level: Level; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-14 shrink-0 place-items-center rounded-full bg-gradient-to-br shadow-inner ring-4 ring-white',
        MEDALS[level],
        className,
      )}
    >
      <Icon d={ICONS.medal} className="size-7" />
    </span>
  )
}

export function GreetingCard({ firstName, points }: { firstName: string; points: CustomerPoints }) {
  const { level, balance, lifetimePoints } = points

  return (
    <section
      aria-label="Tu cuenta"
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent-500 via-accent-600 to-accent-700 p-5 text-white shadow-lg shadow-accent-800/25"
    >
      {/* Círculos de fondo, solo decorativos */}
      <span aria-hidden="true" className="absolute -top-10 -right-8 size-36 rounded-full bg-white/10" />
      <span aria-hidden="true" className="absolute -bottom-12 left-1/3 size-28 rounded-full bg-white/10" />

      <p className="relative font-heading text-2xl font-bold">
        ¡Hola, {firstName}! <span aria-hidden="true">👋</span>
      </p>
      <p className="relative mt-0.5 text-sm text-white/90">
        Tenés{' '}
        <strong className="text-base text-white tabular-nums">
          {balance < 0 && '−'}
          {formatInteger(Math.abs(balance))} pts
        </strong>{' '}
        para canjear
      </p>

      <div className="relative mt-4 flex items-center gap-4 rounded-2xl bg-surface p-4 text-ink shadow-md">
        <LevelMedal level={level.current} />
        <div className="min-w-0 flex-1">
          <p className="font-heading text-lg font-bold">Nivel {LEVELS[level.current]}</p>
          <div className="mt-2 flex items-center gap-3">
            <ProgressBar
              percent={level.progressPercent}
              label={level.next ? `Progreso hacia ${LEVELS[level.next]}` : 'Nivel máximo'}
            />
          </div>
          <p className="mt-1.5 text-sm text-neutral-600 tabular-nums">
            {level.next && level.nextMinPoints !== null
              ? `${formatInteger(lifetimePoints)} / ${formatInteger(level.nextMinPoints)} pts`
              : '¡Llegaste al nivel máximo!'}
          </p>
        </div>
        <Link
          to={CUSTOMER_PATHS.profileLevel}
          aria-label="Ver mi nivel y mis puntos"
          title="Mi nivel"
          className="grid size-11 shrink-0 place-items-center self-center rounded-full text-accent-700 transition-colors hover:bg-accent-50 focus-visible:outline-2 focus-visible:outline-accent-700"
        >
          <Icon d={ICONS.info} className="size-6" />
        </Link>
      </div>
    </section>
  )
}
