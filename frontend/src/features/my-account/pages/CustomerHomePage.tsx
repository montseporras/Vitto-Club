// Pantalla Inicio del Cliente (US-19, contrato §3.10.1). Pide los puntos del cliente de la sesión
// y arma la pantalla con los componentes del feature, en el orden del prototipo. Desde el Sprint 4
// (US-39, CA-39.6) termina con "Tenés un canje para usar" (si hay) y las primeras 5 recompensas.
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert } from '@/shared/components/ui/Alert'
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
}

export function CustomerHomePage({ redemptionsPath }: CustomerHomePageProps) {
  const points = useMyPoints()

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
        <RedemptionToUseCard myRedemptionsUrl={myRedemptionsUrl(redemptionsPath)} />
        <RewardsPreview
          catalogUrl={catalogUrl(redemptionsPath)}
          myRedemptionsUrl={myRedemptionsUrl(redemptionsPath)}
        />
      </div>
    </div>
  )
}
