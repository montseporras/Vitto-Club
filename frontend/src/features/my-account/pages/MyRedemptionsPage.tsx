// "Mis canjes" del Cliente (diseño V2): las misiones del mes con su avance (S5 §3.3.2) y los
// últimos canjes (US-45). "Ver historial" abre el Historial en la pestaña Canjes, con todos los
// canjes, los filtros y la opción de cancelar.
import { useState } from 'react'
import { Link } from 'react-router'
import { useMyRedemptions, type MyRedemption } from '@/features/redemptions'
import { useMyCatalog } from '@/features/rewards'
import { EmptyState } from '@/shared/components/feedback/EmptyState'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert } from '@/shared/components/ui/Alert'
import { ICONS } from '@/shared/components/ui/icons'
import { clientStyles } from '@/styles/ui'
import { useMyMissions } from '../api/my-account.queries'
import { CancelRedemptionDialog } from '../components/CancelRedemptionDialog'
import { ClientPageHeader, SectionHeader } from '../components/client/ClientUI'
import { ConfirmedRedemptionCode } from '../components/RedemptionCodeModal'
import { MissionCard } from '../components/client/MissionCard'
import { RedemptionRow } from '../components/client/RedemptionRow'
import { CUSTOMER_PATHS, historyRedemptionsPath } from '../lib/paths'

const RECENT_COUNT = 5
const MISSIONS_PREVIEW = 2
const RECENT_FILTERS = { order: 'desc' } as const

// Misiones del mes que se pueden seguir sumando (S5 §3.3.2)
function MissionsPreviewSection() {
  const missions = useMyMissions()
  // Primero las que se pueden seguir sumando
  const activeMissions = (missions.data ?? []).filter((mission) => mission.status !== 'EXPIRED')

  return (
    <section aria-labelledby="missions-title" className={clientStyles.section}>
      <SectionHeader
        id="missions-title"
        icon={ICONS.target}
        title="Misiones disponibles"
        action={
          <Link to={CUSTOMER_PATHS.missions} className={clientStyles.outlineLink}>
            Ver todas
          </Link>
        }
      />
      {missions.isPending ? (
        <StatusText className="py-4 text-center">Cargando…</StatusText>
      ) : missions.isError ? (
        <Alert variant="error">No pudimos cargar tus misiones.</Alert>
      ) : activeMissions.length === 0 ? (
        <EmptyState
          compact
          icon={ICONS.target}
          title="No hay misiones este mes"
          description="¡Volvé pronto! Cuando haya una nueva, la vas a ver acá con tu avance."
        />
      ) : (
        <ul className="grid gap-3">
          {activeMissions.slice(0, MISSIONS_PREVIEW).map((mission) => (
            <li key={mission.id}>
              <MissionCard mission={mission} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function MyRedemptionsPage() {
  const [showingCode, setShowingCode] = useState<MyRedemption | null>(null)
  const [cancelling, setCancelling] = useState<MyRedemption | null>(null)
  const redemptions = useMyRedemptions(RECENT_FILTERS)
  // Las fotos salen del catálogo: el canje guarda solo el nombre y los puntos de la recompensa
  const catalog = useMyCatalog('ALL')
  const photoOf = (rewardId: number) =>
    catalog.data?.items.find((reward) => reward.id === rewardId)?.photoUrl ?? null

  const recent = redemptions.data?.items.slice(0, RECENT_COUNT) ?? []

  return (
    <div className={clientStyles.page}>
      <ClientPageHeader title="Mis canjes" />

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <MissionsPreviewSection />

        <section aria-labelledby="recent-redemptions-title" className={clientStyles.section}>
          <SectionHeader
            id="recent-redemptions-title"
            icon={ICONS.ticket}
            title="Mis canjes"
            action={
              <Link to={historyRedemptionsPath()} className={clientStyles.outlineLink}>
                Ver historial
              </Link>
            }
          />
          {redemptions.isPending ? (
            <StatusText className="py-4 text-center">Cargando…</StatusText>
          ) : redemptions.isError ? (
            <Alert variant="error">No pudimos cargar tus canjes.</Alert>
          ) : recent.length === 0 ? (
            <EmptyState
              compact
              icon={ICONS.ticket}
              title="Tus puntos están esperando"
              description="Todavía no canjeaste nada. Elegí una recompensa y canjeala en un toque."
              action={
                <Link to={CUSTOMER_PATHS.rewards} className={clientStyles.outlineLink}>
                  Ver recompensas
                </Link>
              }
            />
          ) : (
            <ul className={clientStyles.list}>
              {recent.map((redemption) => (
                <RedemptionRow
                  key={redemption.id}
                  redemption={redemption}
                  photoUrl={photoOf(redemption.reward.id)}
                  onShowCode={setShowingCode}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      {showingCode && (
        <ConfirmedRedemptionCode
          redemption={showingCode}
          onClose={() => setShowingCode(null)}
          onCancel={(redemption) => {
            setShowingCode(null)
            setCancelling(redemption)
          }}
        />
      )}
      {cancelling && (
        <CancelRedemptionDialog redemption={cancelling} onClose={() => setCancelling(null)} />
      )}
    </div>
  )
}
