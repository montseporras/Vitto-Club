// Detalle de un consumo en un modal (US-23, contrato §3.3.2): datos del consumo, bloque "Anulación"
// si está anulado y "Anular consumo" (modal de US-22) si no. Lo abren Consumos, la ficha del
// cliente y "Ver detalle" de Caja; antes era una página aparte.
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DOCUMENT_TYPES, type DocumentType } from '@/domain/documents';
import { CONSUMPTION_STATUSES } from '@/domain/statuses';
import { VoidConsumptionModal } from '@/features/cashier';
import { StatusText } from '@/shared/components/feedback/StatusText';
import { Alert, AlertMessages } from '@/shared/components/ui/Alert';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { DataList } from '@/shared/components/ui/DataList';
import { Modal } from '@/shared/components/ui/Modal';
import { isoToDisplayDateTime } from '@/shared/lib/dates';
import { formatInteger, formatMoney } from '@/shared/lib/numbers';
import { consumptionsKeys } from '../api/consumptions.keys';
import { useConsumption } from '../api/consumptions.queries';

type ConsumptionDetailModalProps = {
  /** Código visible del consumo, por ejemplo C-000141. */
  code: string;
  onClose: () => void;
  /** Si se pasa, el nombre del cliente es un enlace a su ficha. */
  onViewCustomer?: (customerId: number) => void;
  /** "Sí, registrar consumo" tras anular: Buscar cliente de Caja con ese cliente. */
  onRegisterNew?: (customer: { documentType: DocumentType; documentNumber: string }) => void;
};

export function ConsumptionDetailModal({
  code,
  onClose,
  onViewCustomer,
  onRegisterNew,
}: ConsumptionDetailModalProps) {
  const consumption = useConsumption(code);
  const queryClient = useQueryClient();
  const [voiding, setVoiding] = useState(false);

  if (consumption.isPending) {
    return (
      <Modal title={code} onClose={onClose} tone="light" titleClassName="font-number font-normal lining-nums tabular-nums" className="max-w-3xl">
        <StatusText>Cargando consumo…</StatusText>
      </Modal>
    );
  }

  // 400 (formato de código) y 404 (no existe): el mensaje es el del backend
  if (consumption.isError) {
    return (
      <Modal title={code} onClose={onClose} tone="light" titleClassName="font-number font-normal lining-nums tabular-nums" className="max-w-3xl">
        <Alert variant="error">
          <AlertMessages messages={consumption.error.messages} />
        </Alert>
      </Modal>
    );
  }

  const data = consumption.data;
  const { customer, equivalence } = data;
  const documentText = `${DOCUMENT_TYPES[customer.documentType].label} ${customer.documentNumber}`;
  // Los números van con la fuente de números del prototipo
  const num = (value: string) => <span className="font-number font-normal lining-nums tabular-nums text-lg">{value}</span>;
  const customerName = `${customer.firstName} ${customer.lastName}`;

  const rows = [
    { label: 'Fecha y hora', value: num(isoToDisplayDateTime(data.createdAt)) },
    {
      label: 'Cliente',
      value: (
        <>
          {onViewCustomer ? (
            <button
              type="button"
              onClick={() => onViewCustomer(customer.id)}
              className="cursor-pointer font-semibold underline"
            >
              {customerName}
            </button>
          ) : (
            <span className="font-semibold">{customerName}</span>
          )}
          {' · '}
          {documentText}
        </>
      ),
    },
    { label: 'Monto', value: num(formatMoney(data.amount)) },
    {
      // Del snapshot del consumo, no de la configuración actual (§3.3.2)
      label: 'Equivalencia aplicada',
      value: num(`${formatMoney(equivalence.baseAmount)} = ${formatInteger(equivalence.pointsAwarded)} pts`),
    },
    {
      label: 'Puntos acreditados',
      value: num(
        `+${formatInteger(data.totalPoints)} pts` +
          (data.bonusPoints > 0
            ? ` (incluye ${formatInteger(data.bonusPoints)} de bonificación por primer consumo)`
            : ''),
      ),
    },
    { label: 'Observaciones', value: data.notes ?? '—' },
    { label: 'Registrado por', value: data.registeredBy.name },
  ];

  const voidRows =
    data.status === 'VOIDED'
      ? [
          {
            label: 'Fecha y hora de anulación',
            value: data.voidedAt ? num(isoToDisplayDateTime(data.voidedAt)) : '—',
          },
          { label: 'Anulado por', value: data.voidedBy?.name ?? '—' },
          { label: 'Puntos revertidos', value: num(`−${formatInteger(data.totalPoints)} pts`) },
          { label: 'Motivo', value: data.voidReason ?? '—' },
        ]
      : [];

  // Al cerrar la ventana de anulación (haya anulado o no) se vuelven a pedir el detalle y el listado
  const closeVoidModal = () => {
    setVoiding(false);
    void queryClient.invalidateQueries({ queryKey: consumptionsKeys.all });
  };

  return (
    <>
      <Modal title={`Consumo ${data.code}`} onClose={onClose} tone="light" titleClassName="font-number font-normal lining-nums tabular-nums" className="max-w-3xl">
        <div className="flex flex-col gap-5">
          <div>
            <Badge variant={data.status === 'VOIDED' ? 'danger' : 'success'}>
              {CONSUMPTION_STATUSES[data.status]}
            </Badge>
          </div>

          <DataList items={rows} />

          {data.status === 'VOIDED' && (
            <section aria-labelledby="consumption-void-title" className="flex flex-col gap-3">
              <h3
                id="consumption-void-title"
                className="border-b border-accent-200 pb-1.5 text-sm font-bold uppercase tracking-[0.08em]"
              >
                Anulación
              </h3>
              <DataList items={voidRows} />
            </section>
          )}

          {data.status === 'REGISTERED' && (
            <div className="flex justify-end">
              <Button
                type="button"
                size="lg"
                disabled={!data.canVoid}
                onClick={() => setVoiding(true)}
              >
                Anular consumo
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {voiding && (
        <VoidConsumptionModal
          consumption={data}
          onClose={closeVoidModal}
          onRegisterNew={
            onRegisterNew
              ? () =>
                  onRegisterNew({
                    documentType: customer.documentType,
                    documentNumber: customer.documentNumber,
                  })
              : undefined
          }
        />
      )}
    </>
  );
}
