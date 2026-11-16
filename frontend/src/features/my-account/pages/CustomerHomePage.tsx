// Inicio del Cliente (diseño "App Fidelización V2", US-19 y US-39): saludo con el saldo y el nivel,
// carrusel de promociones, el aviso de canje para usar (si hay) y tres recompensas del catálogo.
import { Link } from 'react-router'
import { useSession } from '@/features/auth'
import { useMyCatalog } from '@/features/rewards'
import { EmptyState } from '@/shared/components/feedback/EmptyState'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert } from '@/shared/components/ui/Alert'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { clientStyles } from '@/styles/ui'
import { useMyPoints } from '../api/my-account.queries'
import { ClientPageHeader, SectionHeader } from '../components/client/ClientUI'
import { GreetingCard } from '../components/client/GreetingCard'
import { PromoCarousel } from '../components/client/PromoCarousel'
import { RewardTile } from '../components/client/RewardCards'
import { NegativeBalanceNotice } from '../components/NegativeBalanceNotice'
import { RedemptionToUseCard } from '../components/RedemptionToUseCard'
import { CUSTOMER_PATHS, historyRedemptionsPath } from '../lib/paths'

// En el celular se ven 3; desde la compu, 4 (la cuarta se oculta en pantallas chicas)
const PREVIEW_COUNT = 4

export function CustomerHomePage() {
  const session = useSession()
  const points = useMyPoints()
  const catalog = useMyCatalog('ALL')
  const firstName = session.status === 'authenticated' ? (session.user.firstName ?? '') : ''

  return (
    <div className={clientStyles.page}>
      <ClientPageHeader title="Inicio" />

      {points.isPending ? (
        <StatusText className="py-8 text-center">Cargando…</StatusText>
      ) : points.isError ? (
        <Alert>No pudimos cargar tus puntos. Probá de nuevo más tarde.</Alert>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className="grid gap-4">
            <GreetingCard firstName={firstName} points={points.data} />
            {points.data.negativeBalance && <NegativeBalanceNotice />}
            <RedemptionToUseCard myRedemptionsUrl={historyRedemptionsPath()} />
          </div>
          <PromoCarousel />
        </div>
      )}

      <section aria-labelledby="home-rewards" className={clientStyles.section}>
        <SectionHeader id="home-rewards" icon={ICONS.gift} title="Recompensas disponibles" />
        {catalog.isPending ? (
          <StatusText className="py-4 text-center">Cargando…</StatusText>
        ) : catalog.isError ? (
          <Alert variant="error">No pudimos cargar las recompensas.</Alert>
        ) : catalog.data.items.length === 0 ? (
          <EmptyState
            compact
            icon={ICONS.gift}
            title="El catálogo está vacío por ahora"
            description="Seguí sumando puntos: cuando haya recompensas, las vas a ver acá."
          />
        ) : (
          <ul className="grid grid-cols-3 gap-3 lg:grid-cols-4">
            {catalog.data.items.slice(0, PREVIEW_COUNT).map((reward, index) => (
              <li key={reward.id} className={index === 3 ? 'hidden lg:block' : undefined}>
                <RewardTile reward={reward} className="h-full" />
              </li>
            ))}
          </ul>
        )}
        <Link to={CUSTOMER_PATHS.rewards} className={`${clientStyles.outlineLink} justify-self-center`}>
          Ver todas las recompensas
          <Icon d={ICONS.arrowRight} className="size-4" />
        </Link>
      </section>
    </div>
  )
}
