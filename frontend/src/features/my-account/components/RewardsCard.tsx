// Tarjeta "Recompensas" del Inicio del Cliente (US-39, CA-39.6, contrato §3.5.1 y prototipo,
// `clienteTab === 'recompensas'`). Reemplaza la tarjeta "Próximamente" del Sprint 3 (US-19).
import { Link } from 'react-router'
import { buttonVariants } from '@/styles/ui'
import { formatInteger } from '@/shared/lib/numbers'
import { cn } from '@/shared/lib/utils'

type RewardsCardProps = {
  /** Saldo actual, el mismo que muestra el resumen de puntos */
  balance: number
  /** "Ver catálogo": la pestaña Canjes, que abre en Catálogo */
  catalogUrl: string
}

export function RewardsCard({ balance, catalogUrl }: RewardsCardProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-orange-200 bg-white p-4 text-sm">
      <p>
        <strong className="block">Recompensas</strong>
        <span className="text-neutral-600">
          Mirá lo que podés canjear con tus {formatInteger(balance)} pts
        </span>
      </p>
      <Link to={catalogUrl} className={cn(buttonVariants(), 'shrink-0 text-xs')}>
        Ver catálogo
      </Link>
    </div>
  )
}
