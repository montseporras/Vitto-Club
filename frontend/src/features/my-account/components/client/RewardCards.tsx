// Recompensas del catálogo en la vista del Cliente (diseño V2): la tarjeta chica del Inicio y la
// fila del listado "Recompensas". Las dos abren el detalle de la recompensa.
import { Link } from 'react-router'
import { rewardExpiryLabel, RewardImage, type CatalogReward } from '@/features/rewards'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { cn } from '@/shared/lib/utils'
import { clientStyles } from '@/styles/ui'
import { rewardPath } from '../../lib/paths'
import { PointsPill } from './ClientUI'

const GENERIC = 'bg-gradient-to-br from-accent-50 to-accent-200 text-accent-700'

/** Tarjeta chica del Inicio: foto arriba, nombre y puntos. */
export function RewardTile({ reward, className }: { reward: CatalogReward; className?: string }) {
  return (
    <Link
      to={rewardPath(reward.id)}
      className={cn(
        clientStyles.card,
        'group flex flex-col overflow-hidden transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-md',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-700',
        className,
      )}
    >
      <RewardImage
        photoUrl={reward.photoUrl}
        className="aspect-[4/3] w-full lg:aspect-[16/10]"
        genericClassName={GENERIC}
        iconClassName="size-9"
      />
      <div className="flex flex-1 flex-col items-start gap-2 p-3">
        <p className="line-clamp-2 flex-1 font-bold leading-snug text-ink">{reward.name}</p>
        <PointsPill points={reward.points} />
      </div>
    </Link>
  )
}

/** Fila del listado "Recompensas": foto, nombre, puntos y la flecha. */
export function RewardRow({ reward }: { reward: CatalogReward }) {
  const expiry = rewardExpiryLabel(reward)
  return (
    <Link
      to={rewardPath(reward.id)}
      className={cn(
        clientStyles.card,
        'group flex items-center gap-4 p-2.5 pr-4 transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-md',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-700',
      )}
    >
      <RewardImage
        photoUrl={reward.photoUrl}
        className="h-20 w-28 rounded-xl sm:w-32"
        genericClassName={GENERIC}
        iconClassName="size-8"
      />
      <div className="grid min-w-0 flex-1 justify-items-start gap-2">
        <p className="line-clamp-2 text-base font-bold leading-snug text-ink">{reward.name}</p>
        <div className="flex flex-wrap items-center gap-2">
          <PointsPill points={reward.points} />
          {/* Solo si importa: vence pronto, agotada o vencida */}
          {expiry.style !== 'neutral' && (
            <span className="text-xs font-semibold text-accent-700">{expiry.text}</span>
          )}
        </div>
      </div>
      <Icon d={ICONS.chevronRight} className={cn(clientStyles.chevron, 'transition-transform group-hover:translate-x-0.5')} />
    </Link>
  )
}
