// Misiones del mes del Cliente (S5 §3.3.2, diseño V2): todas las misiones con su avance, la
// recompensa y el estado. Se abre con el botón ↗ de "Mis canjes".
import { EmptyState } from '@/shared/components/feedback/EmptyState'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert } from '@/shared/components/ui/Alert'
import { ICONS } from '@/shared/components/ui/icons'
import { cn } from '@/shared/lib/utils'
import { clientStyles } from '@/styles/ui'
import { useMyMissions } from '../api/my-account.queries'
import { ClientPageHeader } from '../components/client/ClientUI'
import { MissionCard } from '../components/client/MissionCard'
import { shortDate } from '../lib/client-format'
import { CUSTOMER_PATHS } from '../lib/paths'

export function MissionsPage() {
  const missions = useMyMissions()
  const endsAt = missions.data?.[0]?.endsAt

  return (
    <div className={cn(clientStyles.page, 'lg:max-w-4xl')}>
      <ClientPageHeader title="Misiones" backTo={CUSTOMER_PATHS.redemptions} />

      {missions.isPending ? (
        <StatusText className="py-6 text-center">Cargando…</StatusText>
      ) : missions.isError ? (
        <Alert variant="error">No pudimos cargar tus misiones.</Alert>
      ) : missions.data.length === 0 ? (
        <EmptyState
          icon={ICONS.target}
          title="No hay misiones este mes"
          description="¡Volvé pronto! Cuando haya una nueva, la vas a ver acá con tu avance."
        />
      ) : (
        <>
          <p className="text-sm text-neutral-600">
            Misiones del mes{endsAt && ` · Terminan el ${shortDate(endsAt)}`}
          </p>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
            {missions.data.map((mission) => (
              <li key={mission.id}>
                <MissionCard mission={mission} detailed />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
