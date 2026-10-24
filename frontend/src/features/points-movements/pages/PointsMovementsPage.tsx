import { useState, type FormEvent } from 'react'
import { DOCUMENT_TYPES } from '@/domain/documents'
import { Alert } from '@/shared/components/ui/Alert'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { FormField } from '@/shared/components/forms/FormField'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { Input } from '@/shared/components/ui/Input'
import { Page, PageCard } from '@/shared/components/ui/Page'
import { Select } from '@/shared/components/ui/Select'
import { StatusText } from '@/shared/components/feedback/StatusText'
import {
  Table,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/shared/components/ui/Table'
import { isoToArgentinaDateTime } from '@/shared/lib/dates'
import { usePointsMovements } from '../api/points-movements.queries'
import type {
  PointsMovementFilters,
  PointsMovementType,
} from '../types/points-movement'

const TYPE_LABELS: Record<PointsMovementType, string> = {
  CONSUMPTION_CREDIT: 'Acreditación por consumo',
  VOID_REVERSAL: 'Reversión por anulación',
  MANUAL_ADJUSTMENT: 'Ajuste manual',
  EXPIRATION: 'Vencimiento',
  REDEMPTION: 'Canje',
}

const TYPE_ICONS: Record<PointsMovementType, string> = {
  CONSUMPTION_CREDIT: ICONS.coins,
  VOID_REVERSAL: ICONS.reload,
  MANUAL_ADJUSTMENT: ICONS.pencil,
  EXPIRATION: ICONS.warning,
  REDEMPTION: ICONS.award,
}

const TYPE_OPTIONS = [
  { value: '', label: 'Todos' },
  ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
]

type DraftFilters = {
  q: string
  fromDate: string
  toDate: string
  type: PointsMovementType | ''
}

const emptyFilters: DraftFilters = {
  q: '',
  fromDate: '',
  toDate: '',
  type: '',
}

// El contrato no da texto para este caso: lo validamos antes de enviar (decisión de Jazmín)
const DATE_RANGE_MESSAGE = 'La fecha desde no puede ser posterior a la fecha hasta.'

function signedPoints(points: number) {
  if (points > 0) return `+${points}`
  if (points < 0) return `−${Math.abs(points)}`
  return '0'
}

export function PointsMovementsPage() {
  const [draft, setDraft] = useState<DraftFilters>(emptyFilters)
  const [filters, setFilters] = useState<PointsMovementFilters>({})
  const [page, setPage] = useState(1)
  const [dateError, setDateError] = useState<string | null>(null)
  const result = usePointsMovements(filters, page)
  const appliedDraft: DraftFilters = {
    q: filters.q ?? '',
    fromDate: filters.fromDate ?? '',
    toDate: filters.toDate ?? '',
    type: filters.type ?? '',
  }
  const hasPendingFilters =
    JSON.stringify(draft) !== JSON.stringify(appliedDraft)

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // 'YYYY-MM-DD' se compara bien como texto
    if (draft.fromDate && draft.toDate && draft.fromDate > draft.toDate) {
      setDateError(DATE_RANGE_MESSAGE)
      return
    }
    setDateError(null)
    setFilters({
      ...(draft.q ? { q: draft.q } : {}),
      ...(draft.fromDate ? { fromDate: draft.fromDate } : {}),
      ...(draft.toDate ? { toDate: draft.toDate } : {}),
      ...(draft.type ? { type: draft.type } : {}),
    })
    setPage(1)
  }

  const updateDraft = <TField extends keyof DraftFilters>(
    field: TField,
    value: DraftFilters[TField],
  ) => {
    if (field === 'fromDate' || field === 'toDate') setDateError(null)
    setDraft((current) => ({ ...current, [field]: value }))
  }

  const data = result.data
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1
  const start = data?.total ? (page - 1) * data.limit + 1 : 0
  const end = data ? Math.min(page * data.limit, data.total) : 0

  return (
    <Page>
      <PageCard eyebrow="Administración" title="Movimientos de puntos" variant="plain">
        <form
          onSubmit={applyFilters}
          className="grid gap-4 rounded-xl border border-orange-200 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(12rem,1.3fr)_minmax(9rem,1fr)_minmax(9rem,1fr)_minmax(13rem,1.2fr)_auto]"
        >
          <FormField
            id="movement-customer"
            label="Cliente (DNI o nombre)"
            hideRequiredMark
          >
            <Input
              id="movement-customer"
              value={draft.q}
              maxLength={80}
              placeholder="Buscar"
              onChange={(event) => updateDraft('q', event.target.value)}
            />
          </FormField>

          <fieldset className="grid gap-4 sm:grid-cols-2 xl:col-span-2">
            <legend className="sr-only">Fechas</legend>
            <FormField
              id="movement-from-date"
              label="Desde"
              hideRequiredMark
              error={dateError ?? undefined}
            >
              <Input
                id="movement-from-date"
                type="date"
                aria-invalid={dateError ? true : undefined}
                aria-describedby={dateError ? 'movement-from-date-error' : undefined}
                value={draft.fromDate}
                onChange={(event) => updateDraft('fromDate', event.target.value)}
              />
            </FormField>

            <FormField id="movement-to-date" label="Hasta" hideRequiredMark>
              <Input
                id="movement-to-date"
                type="date"
                value={draft.toDate}
                onChange={(event) => updateDraft('toDate', event.target.value)}
              />
            </FormField>
          </fieldset>

          <FormField
            id="movement-type"
            label="Tipo de movimiento"
            hideRequiredMark
          >
            <Select
              id="movement-type"
              value={draft.type}
              options={TYPE_OPTIONS}
              onChange={(event) =>
                updateDraft(
                  'type',
                  event.target.value as PointsMovementType | '',
                )
              }
            />
          </FormField>

          <div className="flex items-end">
            {hasPendingFilters && (
              <span className="mr-2 text-sm text-accent-700">Sin aplicar</span>
            )}
            <Button type="submit" size="lg" disabled={result.isFetching}>
              <Icon d={ICONS.search} />
              Filtrar
            </Button>
          </div>
        </form>

        {result.isLoading && <StatusText className="mt-6">Cargando movimientos…</StatusText>}

        {result.isError && (
          <Alert className="mt-6">
            <p>{result.error.message}</p>
          </Alert>
        )}

        {data && !result.isError && data.items.length > 0 && (
          <>
            <Table className="mt-6">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Fecha y hora</TableHeaderCell>
                  <TableHeaderCell>Cliente</TableHeaderCell>
                  <TableHeaderCell>Tipo</TableHeaderCell>
                  <TableHeaderCell>Detalle / origen</TableHeaderCell>
                  <TableHeaderCell className="text-right">Puntos</TableHeaderCell>
                  <TableHeaderCell className="text-right">Saldo resultante</TableHeaderCell>
                  <TableHeaderCell>Realizado por</TableHeaderCell>
                </TableRow>
              </TableHead>
              <tbody>
                {data.items.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="whitespace-nowrap">
                      {isoToArgentinaDateTime(movement.createdAt)}
                    </TableCell>
                    <TableCell>
                      <span className="block">
                        {movement.customer.firstName} {movement.customer.lastName}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {DOCUMENT_TYPES[movement.customer.documentType].label}{' '}
                        {movement.customer.documentNumber}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className="inline-flex items-center gap-1.5">
                        <Icon d={TYPE_ICONS[movement.type]} className="size-3.5" />
                        {TYPE_LABELS[movement.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>{movement.description}</TableCell>
                    <TableCell
                      className={`text-right font-semibold ${
                        movement.points > 0
                          ? 'text-green-700'
                          : movement.points < 0
                            ? 'text-red-700'
                            : ''
                      }`}
                    >
                      {signedPoints(movement.points)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${
                        movement.balanceAfter < 0 ? 'text-red-700' : ''
                      }`}
                    >
                      {movement.balanceAfter < 0
                        ? `−${Math.abs(movement.balanceAfter)}`
                        : movement.balanceAfter}{' '}
                      pts
                    </TableCell>
                    <TableCell>{movement.performedBy.name}</TableCell>
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
            No hay movimientos para los filtros seleccionados
          </StatusText>
        )}
      </PageCard>
    </Page>
  )
}
