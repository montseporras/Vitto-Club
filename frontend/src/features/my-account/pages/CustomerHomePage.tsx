// Pantalla Inicio del Cliente (US-19, contrato §3.10.1). Pide los puntos del cliente de la sesión
// y arma la pantalla con los componentes del feature, en el orden del prototipo.
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert } from '@/shared/components/ui/Alert'
import { useMyPoints } from '../api/my-account.queries'
import { NegativeBalanceNotice } from '../components/NegativeBalanceNotice'
import { NextExpirations } from '../components/NextExpirations'
import { PointsSummary } from '../components/PointsSummary'
import { RewardsComingSoonCard } from '../components/RewardsComingSoonCard'

export function CustomerHomePage() {
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
      <RewardsComingSoonCard />
    </div>
  )
}
