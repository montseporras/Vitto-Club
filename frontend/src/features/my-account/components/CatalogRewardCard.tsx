// Tarjeta de una recompensa en el catálogo del Cliente (US-39, CA-39.3 y CA-39.4, contrato §3.5.1 y
// prototipo ClienteCanjes → Catálogo). Si "Canjear" se puede usar lo decide la pantalla con el saldo
// que ya trajo el catálogo (decisión S4-2): es la única cuenta que el contrato deja hacer acá.
import { RewardExpiryTag, type CatalogReward } from '@/features/rewards'
import { Button } from '@/shared/components/ui/Button'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { formatInteger } from '@/shared/lib/numbers'
import { cn } from '@/shared/lib/utils'

// Tooltip de "Canjear" con saldo negativo (§3.5.1)
const NEGATIVE_BALANCE_TITLE = 'Tenés un ajuste pendiente. Comunicate con el restaurante'

type CatalogRewardCardProps = {
  reward: CatalogReward
  /** Saldo actual (`balance` del catálogo) */
  balance: number
  onRedeem: (reward: CatalogReward) => void
}

export function CatalogRewardCard({ reward, balance, onRedeem }: CatalogRewardCardProps) {
  const disabledReward = reward.status === 'DISABLED'
  const negative = balance < 0
  const missing = reward.points - balance
  // "Te faltan {n} pts" solo cuando la recompensa se podría canjear y lo que falta es saldo
  const showMissing = !disabledReward && !negative && missing > 0
  const canRedeem = !disabledReward && !negative && missing <= 0

  return (
    <li
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border-2 border-orange-200 bg-white',
        disabledReward && 'opacity-70',
      )}
    >
      {/* Imagen genérica: la foto de la recompensa es del Sprint 5 (§3.3) */}
      <div
        aria-hidden="true"
        className="grid h-21 place-items-center bg-linear-135 from-orange-100 to-amber-200 text-accent-700"
      >
        <Icon d={ICONS.gift} className="size-8" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <strong className="text-sm leading-tight">{reward.name}</strong>
        {reward.description && (
          <p className="line-clamp-2 text-xs leading-snug text-neutral-600">
            {reward.description}
          </p>
        )}
        <p className="text-sm font-bold text-accent-800">{formatInteger(reward.points)} pts</p>
        <div>
          <RewardExpiryTag reward={reward} />
        </div>
        <div className="flex-1" />
        {/* El span lleva el tooltip: un botón deshabilitado no muestra su title en todos los navegadores */}
        <span title={negative ? NEGATIVE_BALANCE_TITLE : undefined} className="mt-1 block">
          <Button
            type="button"
            className="h-9 w-full text-xs"
            disabled={!canRedeem}
            onClick={() => onRedeem(reward)}
          >
            Canjear
          </Button>
        </span>
        {showMissing && (
          <p className="text-center text-xs text-accent-800">
            Te faltan {formatInteger(missing)} pts
          </p>
        )}
      </div>
    </li>
  )
}
