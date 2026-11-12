// Sección "Consumos" del Administrador (US-23, contrato §3.3.1 y prototipo Consumos): tarjetas
// con los totales, filtros que se aplican con "Filtrar", tabla paginada y "Ver" al detalle.
import { useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { DOCUMENT_TYPES } from '@/domain/documents';
import { CONSUMPTION_STATUSES } from '@/domain/statuses';
import { useAuditActors } from '@/features/audit';
import { StatusText } from '@/shared/components/feedback/StatusText';
import { Alert, AlertMessages } from '@/shared/components/ui/Alert';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { DateRangePicker } from '@/shared/components/ui/DateRangePicker';
import {
  FilterActions,
  FilterBar,
  FilterCell,
} from '@/shared/components/ui/FilterBar';
import { filterControlClass } from '@/shared/components/ui/filter-styles';
import { FilterSelect } from '@/shared/components/ui/FilterSelect';
import { Icon } from '@/shared/components/ui/Icon';
import { ICONS } from '@/shared/components/ui/icons';
import { AdminPanel } from '@/shared/components/ui/AdminPanel';
import { Page } from '@/shared/components/ui/Page';
import { RangePagination } from '@/shared/components/ui/Pagination';
import {
  Table,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/shared/components/ui/Table';
import { useClampPage, useRowsThatFit } from '@/shared/hooks/useRowsThatFit';
import { isoToDisplayDateTime } from '@/shared/lib/dates';
import { formatInteger, formatMoney } from '@/shared/lib/numbers';
import { CONSUMPTIONS_PAGE_SIZE } from '../api/consumptions.api';
import { useConsumptions } from '../api/consumptions.queries';
import { ConsumptionDetailModal } from '../components/ConsumptionDetailModal';
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
  // Consumo abierto en el modal de detalle; "Ver detalle" de Caja llega con ?detalle=C-000141
  const [openCode, setOpenCode] = useState<string | null>(searchParams.get('detalle'));
  const navigate = useNavigate();
  const closeDetail = () => {
    setOpenCode(null);
    if (searchParams.has('detalle')) {
      const next = new URLSearchParams(searchParams);
      next.delete('detalle');
      setSearchParams(next, { replace: true });
    }
  };
  // Filas por página: las que entran en la pantalla (ajustes S5-57)
  const areaRef = useRef<HTMLDivElement>(null);
  const pagerRef = useRef<HTMLElement>(null);
  const limit = useRowsThatFit({ areaRef, pagerRef, initial: CONSUMPTIONS_PAGE_SIZE });
  const result = useConsumptions(filters, page, limit);
  useClampPage(page, setPage, result.data?.total, result.data?.limit);
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

  return (
    <Page className="max-w-none">
      <AdminPanel title="Consumos">
        {data && !result.isError && (
          <>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
              {[
                ['Consumos', formatInteger(data.totals.count)],
                ['Monto total', formatMoney(data.totals.amountTotal)],
                ['Puntos otorgados', formatInteger(data.totals.pointsTotal)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[#f6d0b1] bg-[rgba(253,243,234,0.6)] px-[18px] py-3.5"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.025em] text-[#7e3e20]">
                    {label}
                  </p>
                  <p className="mt-1 font-number text-2xl font-normal lining-nums tabular-nums text-[#2b1a10]">{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-[#7a6e63]">
              Monto total y puntos otorgados no incluyen consumos anulados.
            </p>
          </>
        )}

        <FilterBar onSubmit={applyFilters} className="mt-4" aria-label="Filtros de consumos">
          <FilterCell
            label="Fechas"
            htmlFor="consumption-date-range"
            flex="1.3 1 220px"
            divider={false}
          >
            <DateRangePicker
              id="consumption-date-range"
              label="Fechas"
              variant="bar"
              fromDate={draft.fromDate}
              toDate={draft.toDate}
              onApply={(fromDate, toDate) =>
                setDraft((current) => ({ ...current, fromDate, toDate }))
              }
            />
          </FilterCell>

          <FilterCell label="Cliente (DNI o nombre)" htmlFor="consumption-customer" flex="1.3 1 200px">
            <input
              id="consumption-customer"
              value={draft.q}
              maxLength={80}
              placeholder="Buscar"
              className={filterControlClass}
              onChange={(event) => updateDraft('q', event.target.value)}
            />
          </FilterCell>

          <FilterCell label="Estado" htmlFor="consumption-status" flex="1 1 140px">
            <FilterSelect
              id="consumption-status"
              variant="bar"
              value={draft.status}
              options={STATUS_OPTIONS}
              onChange={(value) => updateDraft('status', value as ConsumptionStatus | '')}
            />
          </FilterCell>

          <FilterCell label="Cajero" htmlFor="consumption-cashier" flex="1 1 160px">
            <FilterSelect
              id="consumption-cashier"
              variant="bar"
              value={draft.registeredBy}
              options={cashierOptions}
              onChange={(value) => updateDraft('registeredBy', value)}
            />
          </FilterCell>

          <FilterActions pending={hasPendingFilters}>
            <Button type="submit" disabled={result.isFetching} className="h-9">
              <Icon d={ICONS.filter} className="size-[15px]" />
              Filtrar
            </Button>
          </FilterActions>
        </FilterBar>

        <div ref={areaRef} className="mt-5">
        {result.isLoading && <StatusText>Cargando consumos…</StatusText>}

        {result.isError && (
          <Alert variant="error">
            <AlertMessages messages={result.error.messages} />
          </Alert>
        )}

        {data && !result.isError && data.items.length > 0 && (
            <Table variant="admin">
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
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setOpenCode(consumption.code)}
                      >
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>

        )}

        {data && !result.isError && data.items.length === 0 && (
          <StatusText className="mt-1 rounded-2xl border border-dashed border-[#f6d0b1] px-4 py-7 text-center text-base text-[#5c5249]">
            No hay consumos para los filtros seleccionados
          </StatusText>
        )}
        </div>

        {data && !result.isError && data.items.length > 0 && (
          <RangePagination
            ref={pagerRef}
            page={data.page}
            total={data.total}
            pageSize={data.limit}
            onChange={setPage}
            disabled={result.isFetching}
          />
        )}
      </AdminPanel>

      {openCode && (
        <ConsumptionDetailModal
          code={openCode}
          onClose={closeDetail}
          // Rutas relativas a /admin/consumos: un feature no importa de app/
          onViewCustomer={(customerId) =>
            navigate(`../clientes/${customerId}`, { relative: 'path' })
          }
          onRegisterNew={(customer) =>
            navigate('../../caja/cliente', { relative: 'path', state: customer })
          }
        />
      )}
    </Page>
  );
}
