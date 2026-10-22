// Historial de consumos del Cliente (US-23): fecha, monto, puntos y estado de cada consumo.
import { toApiError } from '@/shared/api/ApiError';
import { StatusText } from '@/shared/components/feedback/StatusText';
import { Alert } from '@/shared/components/ui/Alert';
import { Badge } from '@/shared/components/ui/Badge';
import { Card } from '@/shared/components/ui/Card';
import { useMyConsumptions } from '../api/consumptions.queries';
import { formatAmount, formatDateTime } from '../lib/format';
import type { ConsumptionStatus } from '../types/consumption';

const STATUS_LABEL: Record<ConsumptionStatus, string> = {
  REGISTERED: 'Registrado',
  VOIDED: 'Anulado',
};

export function CustomerConsumptionHistory() {
  const { data, isPending, isError, error } = useMyConsumptions();

  return (
    <section aria-labelledby="consumption-history-title" className="grid gap-3">
      <h2
        id="consumption-history-title"
        className="border-b border-accent-200 pb-1.5 text-sm font-bold uppercase tracking-[0.08em]"
      >
        Historial de consumos
      </h2>

      {isPending && <StatusText>Cargando tus consumos…</StatusText>}

      {isError && <Alert>{toApiError(error).message}</Alert>}

      {data && data.items.length === 0 && (
        <StatusText>Todavía no tenés consumos.</StatusText>
      )}

      {data && data.items.length > 0 && (
        <ul className="grid gap-3">
          {data.items.map((consumption) => (
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
                    <span>+{consumption.totalPoints} pts</span>
                    <Badge
                      variant={
                        consumption.status === 'VOIDED' ? 'danger' : 'success'
                      }
                    >
                      {STATUS_LABEL[consumption.status]}
                    </Badge>
                  </span>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
