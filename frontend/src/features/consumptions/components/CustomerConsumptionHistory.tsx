// Historial de consumos del Cliente (US-23): fecha, monto, puntos y estado de cada consumo.
import { toApiError } from '@/shared/api/ApiError';
import { StatusText } from '@/shared/components/feedback/StatusText';
import { Alert } from '@/shared/components/ui/Alert';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Card } from '@/shared/components/ui/Card';
import { cn } from '@/shared/lib/utils';
import { useMyConsumptions } from '../api/consumptions.queries';
import { formatAmount, formatDateTime } from '../lib/format';
import type { ConsumptionStatus } from '../types/consumption';

const STATUS_LABEL: Record<ConsumptionStatus, string> = {
  REGISTERED: 'Registrado',
  VOIDED: 'Anulado',
};

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
      <h2
        id="consumption-history-title"
        className="border-b border-accent-200 pb-1.5 text-sm font-bold uppercase tracking-[0.08em]"
      >
        Historial de consumos
      </h2>

      {isPending && <StatusText>Cargando tus consumos…</StatusText>}

      {isError && !data && <Alert>{toApiError(error).message}</Alert>}

      {data && consumptions.length === 0 && (
        <StatusText>Todavía no tenés consumos.</StatusText>
      )}

      {consumptions.length > 0 && (
        <ul className="grid gap-3">
          {consumptions.map((consumption) => {
            const isVoided = consumption.status === 'VOIDED';
            return (
              <li key={consumption.id}>
                <Card className="p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span>
                      {formatDateTime(consumption.createdAt)}
                      <br />
                      <span className="text-xs text-neutral-600">
                        {formatAmount(consumption.amount)}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1 text-right">
                      {/* Un consumo anulado no suma: sus puntos se ven tachados y apagados */}
                      <span
                        className={cn(
                          isVoided && 'text-neutral-500 line-through',
                        )}
                      >
                        +{consumption.totalPoints} pts
                      </span>
                      <Badge variant={isVoided ? 'danger' : 'success'}>
                        {STATUS_LABEL[consumption.status]}
                      </Badge>
                    </span>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {isError && data && <Alert>{toApiError(error).message}</Alert>}

      {hasNextPage && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Cargando…' : 'Ver más'}
        </Button>
      )}
    </section>
  );
}
