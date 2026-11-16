import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Modal } from '@/shared/components/ui/Modal'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { useModalEscape } from '@/shared/hooks/useModalEscape'
import { isoToDisplayDateTime } from '@/shared/lib/dates'
import { formatInteger } from '@/shared/lib/numbers'
import { useMission, useMissionCompletions } from '../api/missions.queries'
import type { Mission } from '../types/mission'
import {
  completedMissionStatusLabel,
  conditionLabel,
  documentLabel,
  missionPhaseLabel,
  missionPhaseVariant,
  missionValidityLabel,
  monthKeyInArgentina,
  monthLabel,
  objectiveLabel,
} from '../lib/mission-presentation'

type MissionDetailModalProps = {
  missionId: number
  onClose: () => void
  onEdit: (mission: Mission) => void
}

export function MissionDetailModal({ missionId, onClose, onEdit }: MissionDetailModalProps) {
  const mission = useMission(missionId)
  const completions = useMissionCompletions(missionId)
  useModalEscape(onClose)

  const currentMonth = monthKeyInArgentina()
  const missionData = mission.data
  const condition = missionData ? conditionLabel(missionData) : ''

  return (
    <Modal
      title={missionData?.name ?? 'Detalle de la misión'}
      onClose={onClose}
      className="max-h-[calc(100vh-32px)] max-w-[720px] overflow-y-auto"
      bodyClassName="space-y-4"
    >
      {mission.isPending && <StatusText>Cargando misión…</StatusText>}
      {mission.isError && (
        <Alert variant="error">
          No se pudo cargar el detalle de la misión.
          <AlertMessages messages={mission.error.messages} />
        </Alert>
      )}

      {missionData && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm text-[#5c5249]">
            <span>Estado:</span>
            <Badge
              variant={missionPhaseVariant(missionData.phase)}
              className="normal-case tracking-normal"
            >
              {missionPhaseLabel(missionData.phase)}
            </Badge>
            {missionData.pendingChanges && (
              <Badge variant="neutral" className="normal-case tracking-normal">
                Cambios desde {monthLabel(missionData.pendingChanges.appliesFrom)}
              </Badge>
            )}
          </div>

          {missionData.description && (
            <p className="text-sm text-[#5c5249]">{missionData.description}</p>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <MissionDetailCard
              label="Objetivo"
              value={objectiveLabel(missionData.objectiveType, missionData.target)}
              description={condition || 'Todos los días'}
            />
            <MissionDetailCard
              label="Recompensa"
              value={
                missionData.rewardPoints === null
                  ? 'Sin recompensa'
                  : `${formatInteger(missionData.rewardPoints)} pts`
              }
            />
            <MissionDetailCard label="Vigencia" value={missionValidityLabel(missionData)} />
            <MissionDetailCard
              label="Completadas este mes"
              value={formatInteger(missionData.completedCount)}
            />
          </div>

          <section aria-labelledby="mission-completed-customers">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 border-b border-[#fbe6d4] pb-2">
              <h4 id="mission-completed-customers" className="font-bold text-[#7e3e20]">
                Clientes que la completaron
              </h4>
              <span className="text-xs text-[#7a6e63]">
                {monthLabel(currentMonth, true)} ·{' '}
                {completions.isPending
                  ? '…'
                  : `${formatInteger(completions.data?.length ?? 0)} ${(completions.data?.length ?? 0) === 1 ? 'cliente' : 'clientes'}`}
              </span>
            </div>

            {completions.isPending && <StatusText>Cargando clientes…</StatusText>}
            {completions.isError && (
              <Alert variant="error">
                No se pudieron cargar los clientes que completaron la misión.
                <AlertMessages messages={completions.error.messages} />
              </Alert>
            )}
            {completions.data && completions.data.length === 0 && (
              <p className="rounded-xl border border-dashed border-[#f6d0b1] px-3 py-5 text-center text-sm text-[#5c5249]">
                Ningún cliente completó esta misión este mes.
              </p>
            )}
            {completions.data && completions.data.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#f6d0b1] text-xs uppercase text-[#7e3e20]">
                      <th className="px-2 py-2">Cliente</th>
                      <th className="px-2 py-2">Documento</th>
                      <th className="px-2 py-2">Completada</th>
                      <th className="px-2 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completions.data.map((completion) => (
                      <tr
                        key={completion.customerMissionId}
                        className="border-b border-[#fbe6d4] align-top"
                      >
                        <td className="px-2 py-3 font-semibold text-[#2b1a10]">
                          {completion.customer.firstName} {completion.customer.lastName}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 text-[#5c5249]">
                          {documentLabel(
                            completion.customer.documentType,
                            completion.customer.documentNumber,
                          )}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 text-[#5c5249]">
                          {isoToDisplayDateTime(completion.completedAt)}
                        </td>
                        <td className="px-2 py-3">
                          <Badge
                            variant={completion.status === 'CLAIMED' ? 'success' : 'neutral'}
                            className="normal-case tracking-normal"
                          >
                            {completedMissionStatusLabel(completion.status)}
                          </Badge>
                          <p className="mt-1 text-xs text-[#7a6e63]">
                            {completion.status === 'CLAIMED'
                              ? `${completion.claimedBy === 'CUSTOMER' ? 'Por el cliente' : 'Por el sistema'} · ${isoToDisplayDateTime(completion.claimedAt)}`
                              : completion.rewardPoints === null
                                ? 'Sin recompensa'
                                : 'Falta reclamar'}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" autoFocus onClick={onClose}>
          Cerrar
        </Button>
        {missionData && (
          <Button type="button" onClick={() => onEdit(missionData)}>
            Editar misión
          </Button>
        )}
      </div>
    </Modal>
  )
}

function MissionDetailCard({
  label,
  value,
  description,
}: {
  label: string
  value: string
  description?: string
}) {
  return (
    <div className="rounded-xl border border-[#f6d0b1] bg-[#fffaf5] px-3 py-2.5">
      <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#7e3e20]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#2b1a10]">{value}</p>
      {description && <p className="mt-0.5 text-xs text-[#7a6e63]">{description}</p>}
    </div>
  )
}
