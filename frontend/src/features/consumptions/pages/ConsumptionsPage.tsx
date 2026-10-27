// Sección "Consumos" del Administrador (US-23, contrato §3.3.1 y prototipo Consumos): tarjetas
// con los totales, filtros que se aplican con "Filtrar", tabla paginada y "Ver" al detalle.
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { DOCUMENT_TYPES } from '@/domain/documents';
import { CONSUMPTION_STATUSES } from '@/domain/statuses';
import { useAuditActors } from '@/features/audit';
import { FormField } from '@/shared/components/forms/FormField';
import { StatusText } from '@/shared/components/feedback/StatusText';
import { Alert, AlertMessages } from '@/shared/components/ui/Alert';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Card } from '@/shared/components/ui/Card';
import { DateRangePicker } from '@/shared/components/ui/DateRangePicker';
import { Icon } from '@/shared/components/ui/Icon';
import { ICONS } from '@/shared/components/ui/icons';
import { Input } from '@/shared/components/ui/Input';
import { Page, PageCard } from '@/shared/components/ui/Page';
import { Select } from '@/shared/components/ui/Select';
import {
  Table,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/shared/components/ui/Table';
import { isoToDisplayDateTime } from '@/shared/lib/dates';
import { formatInteger, formatMoney } from '@/shared/lib/numbers';
import { buttonVariants } from '@/styles/ui';
import { useConsumptions } from '../api/consumptions.queries';
import type {
  ConsumptionFilters,
  ConsumptionStatus,
} from '../types/consumption';

// Lo que muestra el formulario; recién se aplica al apretar "Filtrar"
type DraftFilters = {
  fromDate: string;
  toDate: string;
  q: string;
  status: ConsumptionStatus | '';
  // accountId del empleado, como texto del <select>
  registeredBy: string;
};

const emptyDraft: DraftFilters = {
  fromDate: '',
  toDate: '',
  q: '',
  status: '',
  registeredBy: '',
};

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  ...Object.entries(CONSUMPTION_STATUSES).map(([value, label]) => ({ value, label })),
];

// "Ver todos" de la ficha llega con ?customerId=4 y, en el state, el documento del cliente
type FromCustomerState = { documentNumber?: string } | null;

function parseCustomerId(value: string | null) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

export function ConsumptionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fromCustomer = useLocation().state as FromCustomerState;
  const initialCustomerId = parseCustomerId(searchParams.get('customerId'));
  // Mientras el campo Cliente siga con el documento que trajo la ficha, se filtra por customerId
  const customerQuery = initialCustomerId ? (fromCustomer?.documentNumber ?? '') : '';

  const initialDraft: DraftFilters = { ...emptyDraft, q: customerQuery };
  const [draft, setDraft] = useState<DraftFilters>(initialDraft);
  const [applied, setApplied] = useState<DraftFilters>(initialDraft);
  const [filters, setFilters] = useState<ConsumptionFilters>(
    initialCustomerId ? { customerId: initialCustomerId } : {},
  );
  const [page, setPage] = useState(1);
  const result = useConsumptions(filters, page);
  const actors = useAuditActors();

  const hasPendingFilters = JSON.stringify(draft) !== JSON.stringify(applied);

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const keepCustomer = filters.customerId !== undefined && draft.q === customerQuery;
    const q = draft.q.trim();
    setFilters({
      ...(draft.fromDate ? { fromDate: draft.fromDate } : {}),
      ...(draft.toDate ? { toDate: draft.toDate } : {}),
      ...(keepCustomer
        ? { customerId: filters.customerId }
        : q
          ? { q }
          : {}),
      ...(draft.status ? { status: draft.status } : {}),
      ...(draft.registeredBy
        ? { registeredByAccountId: Number(draft.registeredBy) }
        : {}),
    });
    // Si se cambió el cliente, la URL deja de decir ?customerId=
    if (!keepCustomer && searchParams.has('customerId')) {
      setSearchParams({}, { replace: true });
    }
    setApplied(draft);
    setPage(1);
  };

  const updateDraft = <TField extends keyof DraftFilters>(
    field: TField,
    value: DraftFilters[TField],
  ) => setDraft((current) => ({ ...current, [field]: value }));

  const cashierOptions = [
    { value: '', label: 'Todos' },
    ...(actors.data ?? []).map((actor) => ({
      value: String(actor.accountId),
      label: actor.name,
    })),
  ];

  const data = result.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const start = data?.total ? (page - 1) * data.limit + 1 : 0;
  const end = data ? Math.min(page * data.limit, data.total) : 0;

  return (
    <Page className="max-w-6xl">
      <PageCard eyebrow="Administración" title="Consumos" variant="plain">
        {data && !result.isError && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ['Consumos', formatInteger(data.totals.count)],
                ['Monto total', formatMoney(data.totals.amountTotal)],
                ['Puntos otorgados', formatInteger(data.totals.pointsTotal)],
              ].map(([label, value]) => (
                <Card key={label}>
                  <p className="text-sm font-semibold text-accent-800">{label}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
                </Card>
              ))}
            </div>
            <StatusText className="mt-2">
              Monto total y puntos otorgados no incluyen consumos anulados.
            </StatusText>
          </>
        )}

        <form
          onSubmit={applyFilters}
          className="mt-6 grid gap-4 rounded-xl border border-orange-200 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(13rem,1.2fr)_minmax(12rem,1.3fr)_minmax(9rem,1fr)_minmax(11rem,1fr)]"
        >
          <DateRangePicker
            id="consumption-date-range"
            label="Fechas"
            fromDate={draft.fromDate}
            toDate={draft.toDate}
            onApply={(fromDate, toDate) =>
              setDraft((current) => ({ ...current, fromDate, toDate }))
            }
          />

          <FormField id="consumption-customer" label="Cliente (DNI o nombre)" hideRequiredMark>
            <Input
              id="consumption-customer"
              value={draft.q}
              maxLength={80}
              placeholder="Buscar"
              onChange={(event) => updateDraft('q', event.target.value)}
            />
          </FormField>

          <FormField id="consumption-status" label="Estado" hideRequiredMark>
            <Select
              id="consumption-status"
              value={draft.status}
              options={STATUS_OPTIONS}
              onChange={(event) =>
                updateDraft('status', event.target.value as ConsumptionStatus | '')
              }
            />
          </FormField>

          <FormField id="consumption-cashier" label="Cajero" hideRequiredMark>
            <Select
              id="consumption-cashier"
              value={draft.registeredBy}
              options={cashierOptions}
              onChange={(event) => updateDraft('registeredBy', event.target.value)}
            />
          </FormField>

          <div className="flex items-center justify-end sm:col-span-2 xl:col-span-4">
            {hasPendingFilters && (
              <span className="mr-2 text-sm text-accent-700">Sin aplicar</span>
            )}
            <Button type="submit" size="md" disabled={result.isFetching}>
              <Icon d={ICONS.search} />
              Filtrar
            </Button>
          </div>
        </form>

        {result.isLoading && <StatusText className="mt-6">Cargando consumos…</StatusText>}

        {result.isError && (
          <Alert variant="error" className="mt-6">
            <AlertMessages messages={result.error.messages} />
          </Alert>
        )}

        {data && !result.isError && data.items.length > 0 && (
          <>
            <Table className="mt-6">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Código</TableHeaderCell>
                  <TableHeaderCell>Fecha y hora</TableHeaderCell>
                  <TableHeaderCell>Cliente</TableHeaderCell>
                  <TableHeaderCell className="text-right">Monto</TableHeaderCell>
                  <TableHeaderCell className="text-right">Puntos</TableHeaderCell>
                  <TableHeaderCell>Registrado por</TableHeaderCell>
                  <TableHeaderCell>Estado</TableHeaderCell>
                  <TableHeaderCell>
                    <span className="sr-only">Acciones</span>
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <tbody>
                {data.items.map((consumption) => (
                  <TableRow key={consumption.id}>
                    <TableCell className="font-semibold">{consumption.code}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {isoToDisplayDateTime(consumption.createdAt)}
                    </TableCell>
                    <TableCell>
                      <span className="block">
                        {consumption.customer.firstName} {consumption.customer.lastName}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {DOCUMENT_TYPES[consumption.customer.documentType].label}{' '}
                        {consumption.customer.documentNumber}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(consumption.amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatInteger(consumption.totalPoints)}
                    </TableCell>
                    <TableCell>{consumption.registeredBy.name}</TableCell>
                    <TableCell>
                      <Badge variant={consumption.status === 'VOIDED' ? 'danger' : 'success'}>
                        {CONSUMPTION_STATUSES[consumption.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {/* Relativo a /admin/consumos: un feature no importa de app/ */}
                      <Link
                        to={consumption.code}
                        className={buttonVariants({ variant: 'secondary' })}
                      >
                        Ver
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <StatusText>
                Mostrando {start}–{end} de {data.total}
              </StatusText>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={page <= 1 || result.isFetching}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={page >= totalPages || result.isFetching}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </>
        )}

        {data && !result.isError && data.items.length === 0 && (
          <StatusText className="mt-6 text-center">
            No hay consumos para los filtros seleccionados
          </StatusText>
        )}
      </PageCard>
    </Page>
  );
}
