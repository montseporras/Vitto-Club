// Tarjeta "Tenés un canje para usar" del Inicio del Cliente (US-39, CA-39.6, contrato §3.5.1 y
// prototipo). Sale de `GET /customers/me/canjes?status=CONFIRMED`: si no hay canjes Confirmados
// vigentes, no se muestra. La cuenta regresiva vuelve a pedir la lista al llegar a 0 (§3.11).
import { Link } from 'react-router'
import { expiresInText, useExpiryRefetch, useMyRedemptions } from '@/features/redemptions'
import { buttonVariants } from '@/styles/ui'
import { cn } from '@/shared/lib/utils'

// Solo los Confirmados; el que vence primero es el más viejo
const CONFIRMED_FILTERS = { status: 'CONFIRMED', order: 'asc' } as const

type RedemptionToUseCardProps = {
  /** "Ver código": abre Mis canjes */
  myRedemptionsUrl: string
}

export function RedemptionToUseCard({ myRedemptionsUrl }: RedemptionToUseCardProps) {
  const redemptions = useMyRedemptions(CONFIRMED_FILTERS)
  const now = useExpiryRefetch(redemptions.data?.items, redemptions.refetch)
  const active = (redemptions.data?.items ?? []).filter(
    (item) => item.status === 'CONFIRMED' && new Date(item.expiresAt).getTime() > now,
  )

  // Mientras carga o si falla, no se muestra nada: es un aviso, el Inicio sigue igual
  if (active.length === 0) return null

  const [first] = active
  const others = active.length - 1

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-orange-400 bg-orange-50 p-4 text-sm">
      <p>
        <strong className="block">Tenés un canje para usar</strong>
        <span className="text-neutral-600">
          {first.reward.name} · {expiresInText(first.expiresAt, now).toLowerCase()}
          {others > 0 && ` (y ${others} más)`}
        </span>
      </p>
      <Link to={myRedemptionsUrl} className={cn(buttonVariants(), 'shrink-0 text-xs')}>
        Ver código
      </Link>
    </div>
  )
}
