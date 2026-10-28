// Detalle de un consumo del Administrador (US-23, contrato §3.3.2 y prototipo Consumos): datos del
// consumo, bloque "Anulación" si está anulado y "Anular consumo" (modal de US-22) si no.
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { DOCUMENT_TYPES } from '@/domain/documents';
import { CONSUMPTION_STATUSES } from '@/domain/statuses';
import { VoidConsumptionModal } from '@/features/cashier';
import { StatusText } from '@/shared/components/feedback/StatusText';
import { Alert, AlertMessages } from '@/shared/components/ui/Alert';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { DataList } from '@/shared/components/ui/DataList';
import { Page } from '@/shared/components/ui/Page';
import { isoToDisplayDateTime } from '@/shared/lib/dates';
import { formatInteger, formatMoney } from '@/shared/lib/numbers';
import { cn } from '@/shared/lib/utils';
import { buttonVariants, pageCardBodyStyles, pageCardStyles } from '@/styles/ui';
import { useConsumption } from '../api/consumptions.queries';
import { consumptionsKeys } from '../api/consumptions.keys';

export function ConsumptionDetailPage() {
  const { code = '' } = useParams();
  const consumption = useConsumption(code);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [voiding, setVoiding] = useState(false);

  // Rutas relativas a la URL (/admin/consumos/:code): un feature no importa de app/
  const back = (
    <Link to=".." relative="path" className={buttonVariants({ variant: 'ghost' })}>
      ← Volver a Consumos
    </Link>
  );

  if (consumption.isPending) {
    return (
      <Page className="max-w-4xl">
        {back}
        <StatusText className="mt-4">Cargando consumo…</StatusText>
      </Page>
    );
  }

  // 400 (formato de código) y 404 (no existe): el mensaje es el del backend
  if (consumption.isError) {
    return (
      <Page className="max-w-4xl">
        {back}
        <Alert variant="error" className="mt-4">
          <AlertMessages messages={consumption.error.messages} />
        </Alert>
      </Page>
    );
  }

  const data = consumption.data;
  const { customer, equivalence } = data;
  const documentText = `${DOCUMENT_TYPES[customer.documentType].label} ${customer.documentNumber}`;

  const rows = [
    { label: 'Fecha y hora', value: isoToDisplayDateTime(data.createdAt) },
    {
      label: 'Cliente',
      value: (
        <>
          <Link to={`../../clientes/${customer.id}`} relative="path" className="font-semibold underline">
            {customer.firstName} {customer.lastName}
          </Link>
          {' · '}
          {documentText}
        </>
      ),
    },
    { label: 'Monto', value: formatMoney(data.amount) },
    {
      // Del snapshot del consumo, no de la configuración actual (§3.3.2)
      label: 'Equivalencia aplicada',
      value: `${formatMoney(equivalence.baseAmount)} = ${formatInteger(equivalence.pointsAwarded)} pts`,
    },
    {
      label: 'Puntos acreditados',
      value:
        `+${formatInteger(data.totalPoints)} pts` +
        (data.bonusPoints > 0
          ? ` (incluye ${formatInteger(data.bonusPoints)} de bonificación por primer consumo)`
          : ''),
    },
    { label: 'Observaciones', value: data.notes ?? '—' },
    { label: 'Registrado por', value: data.registeredBy.name },
  ];

  const voidRows =
    data.status === 'VOIDED'
      ? [
          {
            label: 'Fecha y hora de anulación',
            value: data.voidedAt ? isoToDisplayDateTime(data.voidedAt) : '—',
          },
          { label: 'Anulado por', value: data.voidedBy?.name ?? '—' },
          { label: 'Puntos revertidos', value: `−${formatInteger(data.totalPoints)} pts` },
          { label: 'Motivo', value: data.voidReason ?? '—' },
        ]
      : [];

  // Al cerrar el modal (haya anulado o no) se vuelven a pedir el detalle y el listado
  const closeVoidModal = () => {
    setVoiding(false);
    void queryClient.invalidateQueries({ queryKey: consumptionsKeys.all });
  };

  return (
    <Page className="flex max-w-4xl flex-col gap-4">
      <div>{back}</div>

      <section className={cn(pageCardStyles, pageCardBodyStyles, 'flex flex-col gap-6')}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-3xl leading-tight">{data.code}</h2>
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
      </section>

      {voiding && (
        <VoidConsumptionModal
          consumption={data}
          onClose={closeVoidModal}
          // "Sí, registrar consumo": Buscar cliente del panel de Caja con el mismo cliente cargado
          onRegisterNew={() =>
            navigate('../../../caja/cliente', {
              relative: 'path',
              state: {
                documentType: customer.documentType,
                documentNumber: customer.documentNumber,
              },
            })
          }
        />
      )}
    </Page>
  );
}
