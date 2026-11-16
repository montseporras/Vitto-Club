// Pantalla Inicio del Cliente (US-19, contrato §3.10.1). Pide los puntos del cliente de la sesión
// y arma la pantalla con los componentes del feature, en el orden del prototipo. Desde el Sprint 4
// (US-39, CA-39.6) termina con "Tenés un canje para usar" (si hay) y las primeras 5 recompensas.
import { Link } from 'react-router'
import { useMyCustomerMissions } from '@/features/missions'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Card, CardTitle } from '@/shared/components/ui/Card'
import { buttonVariants } from '@/styles/ui'
import { useMyPoints } from '../api/my-account.queries'
import { NegativeBalanceNotice } from '../components/NegativeBalanceNotice'
import { NextExpirations } from '../components/NextExpirations'
import { PointsSummary } from '../components/PointsSummary'
import { RedemptionToUseCard } from '../components/RedemptionToUseCard'
import { RewardsPreview } from '../components/RewardsPreview'
import { catalogUrl, myRedemptionsUrl } from '../components/redemptions-view'

type CustomerHomePageProps = {
  /** Ruta de la pestaña Canjes (la pasa el router: un feature no importa rutas de `app/`) */
  redemptionsPath: string
  /** Ruta de la pestaña Misiones, pasada por el router. */
  missionsPath: string
}

export function CustomerHomePage({ redemptionsPath, missionsPath }: CustomerHomePageProps) {
  const points = useMyPoints()
  const missions = useMyCustomerMissions()

  if (points.isPending) {
    return <StatusText className="py-8 text-center">Cargando…</StatusText>
  }

  if (points.isError) {
    return (
      <Alert>No pudimos cargar tus puntos. Probá de nuevo más tarde.</Alert>
    )
  }

  return (
    <div className="grid gap-6">
      <PointsSummary points={points.data} />
      {points.data.negativeBalance && <NegativeBalanceNotice />}
      <NextExpirations expirations={points.data.nextExpirations} />
      <div className="grid gap-3">
        <Card className="flex items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <CardTitle className="text-sm">Misiones</CardTitle>
            {missions.isPending ? (
              <StatusText className="mt-1">Cargando…</StatusText>
            ) : missions.isError ? (
              <Alert variant="error" className="mt-2">
                {missions.error.messages.length > 0 ? (
                  <AlertMessages messages={missions.error.messages} />
                ) : (
                  <p>{missions.error.message}</p>
                )}
              </Alert>
            ) : (
              <p className="mt-1 text-sm text-neutral-600">
                {missions.data.filter((mission) => mission.status === 'IN_PROGRESS').length} en
                progreso
              </p>
            )}
          </div>
          <Link to={missionsPath} className={buttonVariants()}>
            Ver misiones
          </Link>
        </Card>
        <RedemptionToUseCard myRedemptionsUrl={myRedemptionsUrl(redemptionsPath)} />
        <RewardsPreview
          catalogUrl={catalogUrl(redemptionsPath)}
          myRedemptionsUrl={myRedemptionsUrl(redemptionsPath)}
        />
      </div>
    </div>
  )
}
