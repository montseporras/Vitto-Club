// Misión del mes en la vista del Cliente (diseño V2): ícono, nombre, barra de progreso y avance.
// Completa (página Misiones) suma la descripción, la recompensa y el estado. El avance lo manda el
// backend (S5 §3.3.1); la barra solo lo dibuja.
import { Badge } from '@/shared/components/ui/Badge'
import { formatInteger } from '@/shared/lib/numbers'
import { cn } from '@/shared/lib/utils'
import { clientStyles } from '@/styles/ui'
import { iconForName, missionProgressText } from '../../lib/client-format'
import type { MyMission, MyMissionStatus } from '../../types/missions'
import { ProgressBar, RowIcon } from './ClientUI'

// Etiquetas de los estados (S5 §2.1)
const STATUS: Record<MyMissionStatus, { label: string; variant: 'accent' | 'success' | 'neutral' | 'danger' }> = {
  IN_PROGRESS: { label: 'En progreso', variant: 'accent' },
  COMPLETED: { label: 'Completada', variant: 'success' },
  CLAIMED: { label: 'Reclamada', variant: 'success' },
  EXPIRED: { label: 'Vencida', variant: 'neutral' },
}


export function MissionCard({ mission, detailed = false }: { mission: MyMission; detailed?: boolean }) {
  const percent = mission.target > 0 ? (mission.progress / mission.target) * 100 : 0
  const status = STATUS[mission.status]
  const done = mission.status === 'COMPLETED' || mission.status === 'CLAIMED'

  return (
    <article className={cn(clientStyles.card, 'flex items-center gap-4 p-4')}>
      <RowIcon
        icon={iconForName(mission.mission.name)}
        className={cn(done && 'bg-olive-50 text-olive-800')}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-sans text-base font-bold leading-snug text-ink">{mission.mission.name}</h3>
          {detailed && (
            <Badge variant={status.variant} className="shrink-0 whitespace-nowrap">
              {status.label}
            </Badge>
          )}
        </div>
        {detailed && mission.mission.description && (
          <p className="mt-0.5 text-sm text-neutral-600">{mission.mission.description}</p>
        )}
        <div className="mt-2 flex items-center gap-3">
          <ProgressBar percent={percent} label={`Avance de ${mission.mission.name}`} />
          <span className="shrink-0 text-sm font-semibold text-neutral-700 tabular-nums">
            {missionProgressText(mission)}
          </span>
        </div>
        {detailed && (
          <p className="mt-2 text-sm text-neutral-700">
            Recompensa:{' '}
            <strong className="text-accent-800">
              {mission.rewardPoints === null ? 'Sin recompensa' : `${formatInteger(mission.rewardPoints)} pts`}
            </strong>
          </p>
        )}
      </div>
    </article>
  )
}
