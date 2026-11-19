// Mi perfil → Mi nivel (diseño V2): el nivel con su progreso y beneficios (NIV-BEN), el saldo, los
// próximos vencimientos (US-19) y los movimientos de puntos (US-26). Todo lo calcula el backend.
import { LEVELS } from '@/domain/levels'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert } from '@/shared/components/ui/Alert'
import { formatInteger } from '@/shared/lib/numbers'
import { cn } from '@/shared/lib/utils'
import { clientStyles } from '@/styles/ui'
import { useMyPoints } from '../api/my-account.queries'
import { ClientPageHeader, ProgressBar, SectionHeader } from '../components/client/ClientUI'
import { LevelMedal } from '../components/client/GreetingCard'
import { NegativeBalanceNotice } from '../components/NegativeBalanceNotice'
import { NextExpirations } from '../components/NextExpirations'
import { PointsHistory } from '../components/PointsHistory'
import { ICONS } from '@/shared/components/ui/icons'
import { CUSTOMER_PATHS } from '../lib/paths'

export function MyLevelPage() {
  const points = useMyPoints()

  return (
    <div className={cn(clientStyles.page, 'lg:max-w-4xl')}>
      <ClientPageHeader title="Mi nivel" backTo={CUSTOMER_PATHS.profile} />

      {points.isPending ? (
        <StatusText className="py-6 text-center">Cargando…</StatusText>
      ) : points.isError ? (
        <Alert>No pudimos cargar tus puntos. Probá de nuevo más tarde.</Alert>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className="grid gap-4">
            <section aria-label="Tu nivel" className={cn(clientStyles.card, 'grid gap-4 rounded-3xl p-5')}>
              <div className="flex items-center gap-4">
                <LevelMedal level={points.data.level.current} className="size-16" />
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-2xl font-bold text-ink">
                    Nivel {LEVELS[points.data.level.current]}
                  </p>
                  <p className="text-sm text-neutral-600">
                    {points.data.level.next
                      ? `Te faltan ${formatInteger(points.data.level.pointsToNext)} pts para ${LEVELS[points.data.level.next]}`
                      : '¡Llegaste al nivel máximo!'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ProgressBar percent={points.data.level.progressPercent} label="Progreso de nivel" />
                <span className="shrink-0 text-sm font-semibold tabular-nums text-neutral-700">
                  {points.data.level.nextMinPoints !== null
                    ? `${formatInteger(points.data.lifetimePoints)} / ${formatInteger(points.data.level.nextMinPoints)}`
                    : formatInteger(points.data.lifetimePoints)}
                </span>
              </div>
              {(points.data.level.benefit || points.data.level.nextBenefit) && (
                <dl className="grid gap-2 rounded-2xl bg-accent-50 p-4 text-sm">
                  {points.data.level.benefit && (
                    <div>
                      <dt className="font-bold text-accent-800">Tu beneficio</dt>
                      <dd>{points.data.level.benefit}</dd>
                    </div>
                  )}
                  {points.data.level.next && points.data.level.nextBenefit && (
                    <div>
                      <dt className="font-bold text-accent-800">En {LEVELS[points.data.level.next]}</dt>
                      <dd>{points.data.level.nextBenefit}</dd>
                    </div>
                  )}
                </dl>
              )}
              <p className="text-xs text-neutral-600">
                El nivel sube con los puntos que sumás con tus consumos. Canjear no te baja de nivel.
              </p>
            </section>

            <section aria-label="Tus puntos" className="grid grid-cols-2 gap-3">
              <div className={cn(clientStyles.card, 'p-4')}>
                <p className="text-sm text-neutral-600">Para canjear</p>
                <p
                  className={cn(
                    'font-heading text-2xl font-bold tabular-nums',
                    points.data.balance < 0 ? 'text-negative' : 'text-accent-700',
                  )}
                >
                  {points.data.balance < 0 && '−'}
                  {formatInteger(Math.abs(points.data.balance))} pts
                </p>
              </div>
              <div className={cn(clientStyles.card, 'p-4')}>
                <p className="text-sm text-neutral-600">Acumulados</p>
                <p className="font-heading text-2xl font-bold tabular-nums text-ink">
                  {formatInteger(points.data.lifetimePoints)} pts
                </p>
              </div>
            </section>
            {points.data.negativeBalance && <NegativeBalanceNotice />}
            <NextExpirations expirations={points.data.nextExpirations} />
          </div>

          <section aria-labelledby="movements-title" className={clientStyles.section}>
            <SectionHeader id="movements-title" icon={ICONS.history} title="Movimientos de puntos" />
            <PointsHistory />
          </section>
        </div>
      )}
    </div>
  )
}
