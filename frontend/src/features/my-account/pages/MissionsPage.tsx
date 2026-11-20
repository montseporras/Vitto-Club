// Misiones del mes del Cliente (S5 §3.3.2, diseño V2).
import { useState } from 'react'
import { addMonths, monthKeyInArgentina, monthLabel } from '@/features/missions'
import { EmptyState } from '@/shared/components/feedback/EmptyState'
import { useToast } from '@/shared/components/feedback/useToast'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert } from '@/shared/components/ui/Alert'
import { Select } from '@/shared/components/ui/Select'
import { ICONS } from '@/shared/components/ui/icons'
import { SoonBadge } from '@/shared/components/ui/SoonBadge'
import { FEATURES } from '@/shared/lib/features'
import { formatInteger } from '@/shared/lib/numbers'
import { cn } from '@/shared/lib/utils'
import { clientStyles } from '@/styles/ui'
import { useClaimMissionReward, useMyMissions } from '../api/my-account.queries'
import { ClientPageHeader } from '../components/client/ClientUI'
import { MissionCard } from '../components/client/MissionCard'
import { shortDate } from '../lib/client-format'
import { CUSTOMER_PATHS } from '../lib/paths'

// Diseño de las misiones, guardado para cuando se habiliten (FEATURES.missions)
function MissionsContent() {
  const [period, setPeriod] = useState('')
  const missions = useMyMissions(period || undefined)
  const claim = useClaimMissionReward()
  const showToast = useToast()
  // US-31 (§3.3.3): con éxito, "¡Sumaste {n} pts!"; con un error, el mensaje del backend
  const claimReward = (missionId: number) =>
    claim.mutate(missionId, {
      onSuccess: ({ customerMission }) =>
        showToast(`¡Sumaste ${formatInteger(customerMission.rewardPoints ?? 0)} pts!`),
      onError: (error) => showToast(error.messages.join(' ')),
    })
  const endsAt = missions.data?.[0]?.endsAt
  const currentMonth = monthKeyInArgentina()
  const periodOptions = [
    { value: '', label: 'Este mes' },
    { value: '__previous-months', label: 'Meses anteriores', disabled: true },
    ...Array.from({ length: 12 }, (_, index) => {
      const month = addMonths(currentMonth, -(index + 1))
      return { value: month, label: monthLabel(month, true) }
    }),
  ]
  const title = period
    ? `Misiones de ${monthLabel(period).toLowerCase()}`
    : 'Misiones del mes'
  const subtitle = period
    ? 'Mes terminado'
    : endsAt
      ? `Termina el ${shortDate(endsAt)}`
      : 'Misiones del mes'

  return (
    <div className={cn(clientStyles.page, 'lg:max-w-4xl')}>
      <ClientPageHeader title="Misiones" backTo={CUSTOMER_PATHS.redemptions} />
      <div className="flex items-end justify-between gap-3 border-b border-accent-200 pb-1.5">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.08em]">{title}</h2>
          <p className="mt-1 text-xs text-neutral-600">{subtitle}</p>
        </div>
        <label className="sr-only" htmlFor="my-missions-period">
          Meses anteriores
        </label>
        <Select
          id="my-missions-period"
          aria-label="Meses anteriores"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          options={periodOptions}
          className="h-9 w-auto min-w-36 py-1 text-xs"
        />
      </div>

      {missions.isPending ? (
        <StatusText className="py-6 text-center">Cargando…</StatusText>
      ) : missions.isError ? (
        <Alert variant="error">No pudimos cargar tus misiones.</Alert>
      ) : missions.data.length === 0 ? (
        <EmptyState
          icon={ICONS.target}
          title={period ? 'No tuviste misiones ese mes.' : 'No hay misiones este mes'}
          description={period ? undefined : '¡Volvé pronto! Cuando haya una nueva, la vas a ver acá con tu avance.'}
        />
      ) : (
        <>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
            {missions.data.map((mission) => (
              <li key={mission.id}>
                <MissionCard
                  mission={mission}
                  detailed
                  onClaim={claimReward}
                  claiming={claim.isPending && claim.variables === mission.id}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function MissionsComingSoon() {
  return (
    <div className={cn(clientStyles.page, 'lg:max-w-4xl')}>
      <ClientPageHeader title="Misiones" backTo={CUSTOMER_PATHS.redemptions} />
      <EmptyState
        icon={ICONS.target}
        title="Misiones: próximamente"
        description="Muy pronto vas a poder completar misiones del mes y sumar puntos extra. ¡Las estamos preparando!"
        action={<SoonBadge />}
      />
    </div>
  )
}

export function MissionsPage() {
  return FEATURES.missions ? <MissionsContent /> : <MissionsComingSoon />
}
