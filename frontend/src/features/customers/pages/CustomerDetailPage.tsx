import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { DOCUMENT_TYPES } from '@/domain/documents'
import { LEVELS } from '@/domain/levels'
import { CONSUMPTION_STATUSES, POINTS_MOVEMENT_TYPES } from '@/domain/statuses'
import {
  AdjustPointsModal,
  useCustomerMovements,
  useCustomerPoints,
} from '@/features/cashier'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Card } from '@/shared/components/ui/Card'
import { DataList } from '@/shared/components/ui/DataList'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { Page } from '@/shared/components/ui/Page'
import {
  Table,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/shared/components/ui/Table'
import {
  isoToDisplayDate,
  isoToDisplayDateOnly,
  isoToDisplayDateTime,
} from '@/shared/lib/dates'
import { formatInteger, formatMoney, formatSignedInteger } from '@/shared/lib/numbers'
import { cn } from '@/shared/lib/utils'
import {
  buttonVariants,
  dataListTermStyles,
  pageCardBodyStyles,
  pageCardStyles,
  pointsToneStyles,
  segmentedTabsStyles,
} from '@/styles/ui'
import { useCustomer, useCustomerConsumptions } from '../api/customers.queries'

// La pestaña de consumos muestra los últimos 5 (contrato del Sprint 3, §3.4.1). La de movimientos
// muestra todos, de a 10 (contrato del Sprint 4, §3.13.3)
const TAB_LIMIT = 5
const MOVEMENTS_PAGE_SIZE = 10

type Tab = 'consumptions' | 'movements'

/**
 * "Ver ficha" de Clientes: la ficha del cliente con rol Administrador (contrato §3.8.5 y §3.4.1,
 * prototipo FichaCliente). "Ajustar puntos" abre el modal de US-24; "Ver todos" lleva a Consumos
 * filtrado por el cliente.
 */
export function CustomerDetailPage() {
  const id = Number(useParams().id)
  const customer = useCustomer(id)
  const points = useCustomerPoints(Number.isInteger(id) ? id : null)
  const [tab, setTab] = useState<Tab>('consumptions')
  const [adjusting, setAdjusting] = useState(false)

  // Rutas relativas a la URL (/admin/clientes/:id): un feature no importa de app/
  const back = (
    <Link to=".." relative="path" className={buttonVariants({ variant: 'ghost' })}>
      <Icon d={ICONS.arrowLeft} className="size-4" />
      Volver
    </Link>
  )

  if (customer.isPending || points.isPending) {
    return (
      <Page className="max-w-6xl">
        {back}
        <StatusText className="mt-4">Cargando…</StatusText>
      </Page>
    )
  }

  if (customer.isError || points.isError) {
    const error = customer.error ?? points.error
    return (
      <Page className="max-w-6xl">
        {back}
        <Alert variant="error" className="mt-4">
          No se pudo cargar el cliente.
          <AlertMessages messages={error?.messages ?? []} />
        </Alert>
      </Page>
    )
  }

  const data = customer.data
  const summary = points.data
  const nextExpiration = summary.nextExpirations[0]
  // La ficha es solo del Administrador: el botón no se muestra a otros roles (CA-24.1)
  const adjustButton = (
    <Button type="button" variant="secondary" size="lg" onClick={() => setAdjusting(true)}>
      Ajustar puntos
    </Button>
  )

  return (
    <Page className="flex max-w-6xl flex-col gap-4">
      <div>{back}</div>

      {summary.negativeBalance && (
        <Alert variant="error">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Saldo negativo por anulación de consumo. Requiere ajuste del Administrador.</span>
            {adjustButton}
          </div>
        </Alert>
      )}

      {/* Un solo contenedor blanco, como el prototipo: encabezado, saldo y datos, y pestañas */}
      <section className={cn(pageCardStyles, pageCardBodyStyles, 'flex flex-col gap-6')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-3xl leading-tight">
            {data.firstName} {data.lastName}
          </h2>
          <div className="flex flex-wrap gap-2">
            {/* Va a "Buscar cliente" del panel de Caja con el documento ya cargado */}
            <Link
              to="../../../caja/cliente"
              relative="path"
              state={{ documentType: data.documentType, documentNumber: data.documentNumber }}
              className={buttonVariants({ size: 'lg' })}
            >
              Registrar consumo
            </Link>
            {adjustButton}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Saldo, nivel y vencimientos en un recuadro (prototipo FichaCliente) */}
          <Card className="flex flex-col gap-3.5">
            <div>
              <p className={dataListTermStyles}>Saldo actual</p>
              <p
                className={cn(
                  'mt-1.5 font-heading text-5xl leading-none tabular-nums',
                  summary.negativeBalance ? pointsToneStyles.negative : 'text-ink',
                )}
              >
                {formatInteger(summary.balance)}
                <span className="ml-1.5 text-lg">pts</span>
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Badge variant="accent">Nivel {LEVELS[summary.level.current]}</Badge>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-accent-100"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={summary.level.progressPercent}
                aria-label="Progreso al siguiente nivel"
              >
                <div
                  className="h-full rounded-full bg-accent-700"
                  style={{ width: `${summary.level.progressPercent}%` }}
                />
              </div>
              <p className="text-sm text-neutral-700">
                {summary.level.next
                  ? `Le faltan ${formatInteger(summary.level.pointsToNext)} pts para ${LEVELS[summary.level.next]}`
                  : 'Nivel máximo alcanzado'}
              </p>
            </div>

            <div className="border-t border-accent-200 pt-3">
              <p className={dataListTermStyles}>Puntos por vencer</p>
              <p className="mt-0.5">
                {nextExpiration
                  ? `${formatInteger(nextExpiration.points)} pts vencen el ${isoToDisplayDate(nextExpiration.expiresAt)}`
                  : 'Sin puntos por vencer'}
              </p>
            </div>
          </Card>

          {/* Datos en dos columnas */}
          <DataList
            className="content-start grid-cols-2 border-t-0 pt-1"
            items={[
              { label: DOCUMENT_TYPES[data.documentType].label, value: data.documentNumber },
              { label: 'Fecha de alta', value: isoToDisplayDateOnly(data.createdAt) },
              { label: 'Email', value: data.email },
              { label: 'Teléfono', value: data.phone ?? '—' },
            ]}
          />
        </div>

        {/* Pestañas como control segmentado (prototipo FichaCliente: .vc-seg) */}
        <div role="tablist" aria-label="Actividad del cliente" className={segmentedTabsStyles.group}>
          {(
            [
              ['consumptions', 'Últimos consumos'],
              ['movements', 'Movimientos de puntos'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                segmentedTabsStyles.option,
                tab === value ? segmentedTabsStyles.optionActive : segmentedTabsStyles.optionIdle,
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div role="tabpanel">
          {tab === 'consumptions' ? (
            <ConsumptionsTab customerId={id} documentNumber={data.documentNumber} />
          ) : (
            <MovementsTab customerId={id} />
          )}
        </div>
      </section>

      {adjusting && (
        <AdjustPointsModal customer={data} onClose={() => setAdjusting(false)} />
      )}
    </Page>
  )
}

function ConsumptionsTab({
  customerId,
  documentNumber,
}: {
  customerId: number
  documentNumber: string
}) {
  const consumptions = useCustomerConsumptions(customerId, TAB_LIMIT)

  if (consumptions.isPending) return <StatusText>Cargando…</StatusText>
  if (consumptions.isError) {
    return (
      <Alert variant="error">
        No se pudieron cargar los consumos.
        <AlertMessages messages={consumptions.error.messages} />
      </Alert>
    )
  }
  if (consumptions.data.items.length === 0) {
    return <StatusText>Este cliente todavía no tiene consumos.</StatusText>
  }

  return (
    <>
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Código</TableHeaderCell>
            <TableHeaderCell>Fecha y hora</TableHeaderCell>
            <TableHeaderCell className="text-right">Monto</TableHeaderCell>
            <TableHeaderCell className="text-right">Puntos</TableHeaderCell>
            <TableHeaderCell>Estado</TableHeaderCell>
            <TableHeaderCell>
              <span className="sr-only">Acciones</span>
            </TableHeaderCell>
          </tr>
        </TableHead>
        <tbody>
          {consumptions.data.items.map((consumption) => (
            <TableRow key={consumption.id} highlight>
              <TableCell className="font-semibold">{consumption.code}</TableCell>
              <TableCell>{isoToDisplayDateTime(consumption.createdAt)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(consumption.amount)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatInteger(consumption.totalPoints)}
              </TableCell>
              <TableCell>
                <Badge variant={consumption.status === 'VOIDED' ? 'danger' : 'success'}>
                  {CONSUMPTION_STATUSES[consumption.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {/* Detalle del consumo (US-23) */}
                <Link
                  to={`../../consumos/${consumption.code}`}
                  relative="path"
                  className={buttonVariants({ variant: 'secondary' })}
                >
                  Ver
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
      <div className="mt-3">
        {/* Consumos filtrado por este cliente; el documento se muestra en el filtro Cliente (US-23) */}
        <Link
          to={`../../consumos?customerId=${customerId}`}
          relative="path"
          state={{ documentNumber }}
          className={buttonVariants({ variant: 'ghost' })}
        >
          Ver todos
        </Link>
      </div>
    </>
  )
}

function MovementsTab({ customerId }: { customerId: number }) {
  const [page, setPage] = useState(1)
  const movements = useCustomerMovements(customerId, MOVEMENTS_PAGE_SIZE, true, page)

  if (movements.isPending) return <StatusText>Cargando…</StatusText>
  if (movements.isError) {
    return (
      <Alert variant="error">
        No se pudieron cargar los movimientos.
        <AlertMessages messages={movements.error.messages} />
      </Alert>
    )
  }
  if (movements.data.items.length === 0) {
    return <StatusText>Este cliente todavía no tiene movimientos de puntos.</StatusText>
  }

  const { total } = movements.data
  const totalPages = Math.ceil(total / MOVEMENTS_PAGE_SIZE)
  const start = (page - 1) * MOVEMENTS_PAGE_SIZE + 1
  const end = Math.min(page * MOVEMENTS_PAGE_SIZE, total)

  return (
    <>
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Fecha y hora</TableHeaderCell>
            <TableHeaderCell>Tipo</TableHeaderCell>
            <TableHeaderCell>Detalle</TableHeaderCell>
            <TableHeaderCell className="text-right">Puntos</TableHeaderCell>
          </tr>
        </TableHead>
        <tbody>
          {movements.data.items.map((movement) => (
            <TableRow key={movement.id} highlight>
              <TableCell>{isoToDisplayDateTime(movement.createdAt)}</TableCell>
              <TableCell>
                <Badge variant={movement.points < 0 ? 'danger' : 'success'}>
                  {POINTS_MOVEMENT_TYPES[movement.type]}
                </Badge>
              </TableCell>
              <TableCell>{movement.description}</TableCell>
              <TableCell
                className={cn(
                  'text-right font-semibold tabular-nums',
                  movement.points < 0 ? pointsToneStyles.negative : pointsToneStyles.positive,
                )}
              >
                {formatSignedInteger(movement.points)}
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>

      {/* Como el prototipo: el paginado aparece solo si hay más de una página */}
      {totalPages > 1 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <StatusText>
            Mostrando {start}–{end} de {total}
          </StatusText>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={page <= 1 || movements.isFetching}
              onClick={() => setPage((current) => current - 1)}
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={page >= totalPages || movements.isFetching}
              onClick={() => setPage((current) => current + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
