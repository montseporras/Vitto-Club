import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardTitle } from '@/shared/components/ui/Card'
import { isoToDisplayDateTime } from '@/shared/lib/dates'
import { formatInteger, formatMoney } from '@/shared/lib/numbers'
import { conditionLabel } from '../lib/mission-presentation'
import type { CustomerMission, CustomerMissionStatus } from '../types/mission'

const STATUS_LABELS: Record<CustomerMissionStatus, string> = {
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completada',
  CLAIMED: 'Reclamada',
  EXPIRED: 'Vencida',
}

function statusVariant(status: CustomerMissionStatus) {
  if (status === 'IN_PROGRESS') return 'neutral'
  if (status === 'EXPIRED') return 'danger'
  return 'success'
}

function progressLabel(mission: CustomerMission) {
  if (mission.objectiveType === 'CONSUMPTION_AMOUNT') {
    return `${formatMoney(mission.progress).replace('$', '$ ')} / ${formatMoney(mission.target).replace('$', '$ ')}`
  }
  return `${formatInteger(mission.progress)} / ${formatInteger(mission.target)} ${mission.target === 1 ? 'consumo' : 'consumos'}`
}

function missionNote(mission: CustomerMission) {
  if (mission.status === 'CLAIMED' && mission.claimedAt) {
    return `Reclamada el ${isoToDisplayDateTime(mission.claimedAt).slice(0, 10)}`
  }
  if (mission.status === 'COMPLETED' && mission.rewardPoints === null && mission.completedAt) {
    return `Completada el ${isoToDisplayDateTime(mission.completedAt).slice(0, 10)}. Esta misión no tiene recompensa.`
  }
  if (mission.status === 'EXPIRED') return 'Terminó el mes sin llegar al objetivo.'
  return null
}

type CustomerMissionCardProps = {
  mission: CustomerMission
  onClaim?: (missionId: number) => void
}

/** Tarjeta de progreso compartida por Mis misiones y la consulta del personal. */
export function CustomerMissionCard({ mission, onClaim }: CustomerMissionCardProps) {
  const progress = progressLabel(mission)
  const progressPercent =
    mission.target > 0
      ? Math.min(100, Math.round((mission.progress / mission.target) * 100))
      : 0
  const condition = conditionLabel(mission)
  const note = missionNote(mission)
  const canClaim = 'canClaim' in mission && mission.canClaim

  return (
    <Card className="p-4 text-left">
      <div className="flex items-start justify-between gap-2">
        <CardTitle className="text-sm leading-snug">{mission.mission.name}</CardTitle>
        <Badge variant={statusVariant(mission.status)} className="shrink-0">
          {STATUS_LABELS[mission.status]}
        </Badge>
      </div>

      {mission.mission.description && (
        <p className="mt-1 text-sm leading-relaxed text-neutral-700">
          {mission.mission.description}
        </p>
      )}

      {condition && (
        <p className="mt-1 text-xs text-accent-800">Suma solo {condition}</p>
      )}

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-accent-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent}
        aria-label={`Progreso de ${mission.mission.name}`}
        aria-valuetext={progress}
      >
        <div
          className="h-full rounded-full bg-accent-700"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm">
        <span>{progress}</span>
        <span>
          <span className="text-neutral-600">Recompensa:</span>{' '}
          <strong>
            {mission.rewardPoints === null
              ? 'Sin recompensa'
              : `${formatInteger(mission.rewardPoints)} pts`}
          </strong>
        </span>
      </div>

      {note && <p className="mt-1.5 text-xs text-neutral-600">{note}</p>}

      {canClaim && (
        <Button
          type="button"
          className="mt-3 w-full"
          disabled={!onClaim || mission.id === null}
          onClick={() => {
            if (mission.id !== null) onClaim?.(mission.id)
          }}
        >
          Reclamar recompensa
        </Button>
      )}
    </Card>
  )
}
