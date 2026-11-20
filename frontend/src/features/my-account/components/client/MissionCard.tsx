// Misión del mes en la vista del Cliente (diseño V2): ícono, nombre, barra de progreso y avance.
// Completa (página Misiones) suma la descripción, la recompensa y el estado. El avance lo manda el
// backend (S5 §3.3.1); la barra solo lo dibuja.
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { formatInteger } from '@/shared/lib/numbers'
import { cn } from '@/shared/lib/utils'
import { clientStyles } from '@/styles/ui'
import { iconForName, missionProgressText } from '../../lib/client-format'
import type { MyMission, MyMissionStatus } from '../../types/missions'
import { RowIcon } from './ClientUI'

// Etiquetas de los estados (S5 §2.1)
const STATUS: Record<MyMissionStatus, { label: string; variant: 'accent' | 'success' | 'neutral' | 'danger' }> = {
  IN_PROGRESS: { label: 'En progreso', variant: 'accent' },
  COMPLETED: { label: 'Completada', variant: 'success' },
  CLAIMED: { label: 'Reclamada', variant: 'success' },
  EXPIRED: { label: 'Vencida', variant: 'neutral' },
}


// Hasta este objetivo, la barra se dibuja por tramos (uno por consumo); más arriba, continua
const MAX_SEGMENTS = 10

/**
 * Avance de la misión. Si mide cantidad de consumos (y son pocos), un tramo por consumo: se ve de
 * un vistazo cuántos faltan. Si no, una barra continua con degradé.
 */
function MissionProgress({ mission }: { mission: MyMission }) {
  const label = `Avance de ${mission.mission.name}: ${missionProgressText(mission)}`
  const done = mission.status === 'COMPLETED' || mission.status === 'CLAIMED'
  const fill = done ? 'bg-olive' : 'bg-gradient-to-r from-accent-400 to-accent-700'

  if (mission.objectiveType === 'CONSUMPTION_COUNT' && mission.target <= MAX_SEGMENTS) {
    return (
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={mission.target}
        aria-valuenow={mission.progress}
        className="flex flex-1 gap-1"
      >
        {Array.from({ length: mission.target }, (_, index) => (
          <span
            key={index}
            className={cn('h-2 flex-1 rounded-full transition-colors duration-300', index < mission.progress ? fill : 'bg-accent-100')}
          />
        ))}
      </div>
    )
  }

  const percent = mission.target > 0 ? Math.min(100, (mission.progress / mission.target) * 100) : 0
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      className="h-2 flex-1 overflow-hidden rounded-full bg-accent-100"
    >
      <div className={cn('h-full rounded-full transition-[width] duration-500', fill)} style={{ width: `${percent}%` }} />
    </div>
  )
}

type MissionCardProps = {
  mission: MyMission
  detailed?: boolean
  /** Solo en la página Misiones: muestra "Reclamar recompensa" si `canClaim` (S5 §3.3.2). */
  onClaim?: (missionId: number) => void
  claiming?: boolean
}

export function MissionCard({ mission, detailed = false, onClaim, claiming = false }: MissionCardProps) {
  const status = STATUS[mission.status]
  const done = mission.status === 'COMPLETED' || mission.status === 'CLAIMED'

  return (
    <article className={cn(clientStyles.card, 'min-w-0 px-3.5 py-3')}>
      <div className="flex min-w-0 items-center gap-3">
        <RowIcon
          icon={iconForName(mission.mission.name)}
          className={cn('size-10 rounded-lg', done && 'bg-olive-50 text-olive-800')}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 truncate font-sans text-sm font-bold leading-snug text-ink">{mission.mission.name}</h3>
            {detailed && (
              <Badge variant={status.variant} className="shrink-0 whitespace-nowrap">
                {status.label}
              </Badge>
            )}
          </div>
          {detailed && mission.mission.description && (
            <p className="text-sm text-neutral-600">{mission.mission.description}</p>
          )}
          <div className="mt-1.5 flex items-center gap-2.5">
            <MissionProgress mission={mission} />
            <span
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
                done ? 'bg-olive-50 text-olive-800' : 'bg-accent-50 text-accent-800',
              )}
            >
              {missionProgressText(mission)}
            </span>
          </div>
          {detailed && (
            <p className="mt-1.5 text-sm text-neutral-700">
              Recompensa:{' '}
              <strong className="text-accent-800">
                {mission.rewardPoints === null ? 'Sin recompensa' : `${formatInteger(mission.rewardPoints)} pts`}
              </strong>
            </p>
          )}
        </div>
      </div>
      {detailed && mission.canClaim && onClaim && (
        <Button
          type="button"
          className="mt-2.5 w-full"
          loading={claiming}
          disabled={claiming}
          onClick={() => onClaim(mission.id)}
        >
          Reclamar recompensa
        </Button>
      )}
    </article>
  )
}
