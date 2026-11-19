// Historial de consumos del Cliente (US-23), con el diseño "App Fidelización V2": una fila por
// consumo con ícono, fecha y monto, y los puntos a la derecha. La flecha abre el detalle.
import { useState } from 'react';
import { toApiError } from '@/shared/api/ApiError';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { StatusText } from '@/shared/components/feedback/StatusText';
import { Alert } from '@/shared/components/ui/Alert';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Icon } from '@/shared/components/ui/Icon';
import { ICONS } from '@/shared/components/ui/icons';
import { formatInteger } from '@/shared/lib/numbers';
import { cn } from '@/shared/lib/utils';
import { clientStyles } from '@/styles/ui';
import { useMyConsumptions } from '../api/consumptions.queries';
import { formatAmount, formatDateTime, formatShortDate } from '../lib/format';
import type { CustomerConsumption } from '../types/consumption';

function ConsumptionRow({ consumption }: { consumption: CustomerConsumption }) {
  const [open, setOpen] = useState(false);
  const isVoided = consumption.status === 'VOIDED';
  const detailId = `consumption-${consumption.id}-detail`;

  return (
    <li className="even:bg-accent-50/60">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailId}
        onClick={() => setOpen((current) => !current)}
        className={cn(clientStyles.rowLink, 'even:bg-transparent')}
      >
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-100 text-accent-700"
        >
          <Icon d={ICONS.receipt} className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn(clientStyles.rowTitle, 'block')}>
            {consumption.notes?.trim() || `Consumo ${consumption.code}`}
          </span>
          <span className={cn(clientStyles.rowMeta, 'block tabular-nums')}>
            <span className="whitespace-nowrap">{formatShortDate(consumption.createdAt)}</span>
            {' · '}
            <span className="whitespace-nowrap">{formatAmount(consumption.amount)}</span>
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          {/* Un consumo anulado no suma: sus puntos se ven tachados y con la etiqueta */}
          <span
            className={cn(
              'text-sm font-bold tabular-nums text-olive-800',
              isVoided && 'text-neutral-500 line-through',
            )}
          >
            +{formatInteger(consumption.totalPoints)} pts
          </span>
          {isVoided && <Badge variant="danger">Anulado</Badge>}
        </span>
        <Icon
          d={ICONS.chevronRight}
          className={cn(clientStyles.chevron, 'transition-transform duration-200', open && 'rotate-90')}
        />
      </button>

      {open && (
        <dl id={detailId} className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 px-4 pb-4 pl-[4.75rem] text-sm">
          <dt className="text-neutral-600">Código</dt>
          <dd className="font-semibold">{consumption.code}</dd>
          <dt className="text-neutral-600">Fecha y hora</dt>
          <dd>{formatDateTime(consumption.createdAt)}</dd>
          <dt className="text-neutral-600">Puntos</dt>
          <dd>
            {formatInteger(consumption.points)}
            {consumption.bonusPoints > 0 &&
              ` + ${formatInteger(consumption.bonusPoints)} de bonificación por primer consumo`}
          </dd>
          {isVoided && (
            <>
              <dt className="text-neutral-600">Anulado</dt>
              <dd>{consumption.voidReason ?? '—'}</dd>
            </>
          )}
        </dl>
      )}
    </li>
  );
}

export function CustomerConsumptionHistory() {
  const {
    data,
    isPending,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useMyConsumptions();

  const consumptions = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section aria-labelledby="consumption-history-title" className="grid gap-3">
      <h2 id="consumption-history-title" className="sr-only">
        Historial de consumos
      </h2>

      {isPending && <StatusText>Cargando tus consumos…</StatusText>}

      {isError && !data && <Alert>{toApiError(error).message}</Alert>}

      {data && consumptions.length === 0 && (
        <EmptyState
          icon={ICONS.receipt}
          title="Todavía no hay consumos"
          description="La próxima vez que vengas, mostrá tu documento en la caja: tu consumo aparece acá con los puntos que sumaste."
        />
      )}

      {consumptions.length > 0 && (
        <ul className={clientStyles.list}>
          {consumptions.map((consumption) => (
            <ConsumptionRow key={consumption.id} consumption={consumption} />
          ))}
        </ul>
      )}

      {isError && data && <Alert>{toApiError(error).message}</Alert>}

      {hasNextPage && (
        <Button
          type="button"
          variant="secondary"
          className="justify-self-center"
          loading={isFetchingNextPage}
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Cargando…' : 'Ver más'}
        </Button>
      )}
    </section>
  );
}
