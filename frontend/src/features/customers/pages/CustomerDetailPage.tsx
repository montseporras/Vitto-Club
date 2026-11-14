import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { DOCUMENT_TYPES } from '@/domain/documents'
import { LEVELS } from '@/domain/levels'
import { CONSUMPTION_STATUSES, POINTS_MOVEMENT_TYPES } from '@/domain/statuses'
import {
  AdjustPointsModal,
  useCustomerMovements,
  useCustomerPoints,
} from '@/features/cashier'
import { ConsumptionDetailModal } from '@/features/consumptions'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { AdminPanel } from '@/shared/components/ui/AdminPanel'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
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
import { buttonVariants, pointsToneStyles, segmentedTabsStyles } from '@/styles/ui'
import { useCustomer, useCustomerConsumptions } from '../api/customers.queries'

// La pestaña de consumos muestra los últimos 5 (contrato del Sprint 3, §3.4.1). La de movimientos
// muestra todos, de a 10 (contrato del Sprint 4, §3.13.3)
const TAB_LIMIT = 5
const MOVEMENTS_PAGE_SIZE = 10

type Tab = 'consumptions' | 'movements'

// Etiqueta de datos del prototipo (FichaCliente): 12 px, negrita, mayúsculas, marrón
const labelClass = 'text-xs font-bold uppercase tracking-[0.025em] text-[#7e3e20]'

// Estado vacío del prototipo: recuadro punteado
const emptyClass =
  'rounded-2xl border border-dashed border-[#f6d0b1] px-4 py-6 text-center text-base text-[#5c5249]'

/**
 * "Ver ficha" de Clientes: la ficha del cliente con rol Administrador (contrato §3.8.5 y §3.4.1,
 * prototipo FichaCliente), en el recuadro común de Administración. "Ajustar puntos" abre el modal
 * de US-24; "Ver todos" lleva a Consumos filtrado por el cliente.
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
      <Page className="max-w-none">
        {back}
        <StatusText className="mt-4">Cargando…</StatusText>
      </Page>
    )
  }

  if (customer.isError || points.isError) {
    const error = customer.error ?? points.error
    return (
      <Page className="max-w-none">
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
    <Button type="button" variant="secondary" onClick={() => setAdjusting(true)}>
      Ajustar puntos
    </Button>
  )

  const details = [
    { label: DOCUMENT_TYPES[data.documentType].label, value: data.documentNumber },
    { label: 'Fecha de alta', value: isoToDisplayDateOnly(data.createdAt) },
    { label: 'Email', value: data.email },
    { label: 'Teléfono', value: data.phone ?? '—' },
  ]

  return (
    <Page className="flex max-w-none flex-col gap-4">
      <div>{back}</div>

      {summary.negativeBalance && (
        <Alert variant="error">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Saldo negativo por anulación de consumo. Requiere ajuste del Administrador.</span>
            {adjustButton}
          </div>
        </Alert>
      )}

      {/* 3.5 rem = el "Volver" de arriba (40 px) y su espacio (16 px), para que el recuadro siga
          llegando a 32 px del borde de abajo */}
      <AdminPanel
        title={`${data.firstName} ${data.lastName}`}
        className="min-h-[calc(100svh-8rem-3.5rem)]"
        actions={
          <div className="flex flex-wrap gap-2">
            {/* Va a "Buscar cliente" del panel de Caja con el documento ya cargado */}
            <Link
              to="../../../caja/cliente"
              relative="path"
              state={{ documentType: data.documentType, documentNumber: data.documentNumber }}
              className={buttonVariants()}
            >
              Registrar consumo
            </Link>
            {adjustButton}
          </div>
        }
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
          {/* Saldo, nivel y vencimientos en un recuadro (prototipo FichaCliente) */}
          <div className="rounded-2xl border border-[#f6d0b1] bg-[rgba(253,243,234,0.6)] p-5">
            <p className={labelClass}>Saldo actual</p>
            <p
              className={cn(
                'mt-1.5 font-number text-5xl font-normal leading-none lining-nums tabular-nums',
                summary.negativeBalance ? pointsToneStyles.negative : 'text-[#2b1a10]',
              )}
            >
              {formatInteger(summary.balance)}
              <span className="ml-1.5 text-lg">pts</span>
            </p>

            <div className="mt-3.5 flex flex-col gap-1.5">
              <Badge variant="accent" className="self-start">
                Nivel {LEVELS[summary.level.current]}
              </Badge>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-[#fbe6d4]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={summary.level.progressPercent}
                aria-label="Progreso al siguiente nivel"
              >
                <div
                  className="h-full rounded-full bg-[#a8532a]"
                  style={{ width: `${summary.level.progressPercent}%` }}
                />
              </div>
              <p className="text-[13px] text-[#5c5249]">
                {summary.level.next
                  ? `Le faltan ${formatInteger(summary.level.pointsToNext)} pts para ${LEVELS[summary.level.next]}`
                  : 'Nivel máximo alcanzado'}
              </p>
              {/* NIV-BEN (CA-NB.5): el beneficio del nivel, solo si tiene texto */}
              {summary.level.benefit && (
                <p className="text-[13px] text-[#2b1a10]">
                  <span className="font-medium">Beneficio:</span>{' '}
                  {summary.level.benefit}
                </p>
              )}
            </div>

            <div className="mt-3.5 border-t border-[#f6d0b1] pt-3">
              <p className={labelClass}>Puntos por vencer</p>
              <p className="mt-0.5 text-base text-[#2b1a10]">
                {nextExpiration
                  ? `${formatInteger(nextExpiration.points)} pts vencen el ${isoToDisplayDate(nextExpiration.expiresAt)}`
                  : 'Sin puntos por vencer'}
              </p>
            </div>
          </div>

          {/* Datos en dos columnas */}
          <dl className="grid grid-cols-2 content-start gap-x-6 gap-y-4 py-1">
            {details.map((item) => (
              <div key={item.label} className="flex min-w-0 flex-col gap-0.5">
                <dt className={labelClass}>{item.label}</dt>
                <dd className="text-base break-words text-[#2b1a10]">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Pestañas como control segmentado (prototipo FichaCliente: .vc-seg) */}
        <div
          role="tablist"
          aria-label="Actividad del cliente"
          className={cn(segmentedTabsStyles.group, 'mt-7 max-w-[460px]')}
        >
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

        <div role="tabpanel" className="mt-4">
          {tab === 'consumptions' ? (
            <ConsumptionsTab customerId={id} documentNumber={data.documentNumber} />
          ) : (
            <MovementsTab customerId={id} />
          )}
        </div>
      </AdminPanel>

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
  const navigate = useNavigate()
  // Consumo abierto en el modal de detalle (US-23)
  const [openCode, setOpenCode] = useState<string | null>(null)

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
    return <p className={emptyClass}>Este cliente todavía no tiene consumos.</p>
  }

  return (
    <>
      <Table variant="admin">
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
              <TableCell className="font-bold whitespace-nowrap">{consumption.code}</TableCell>
              <TableCell className="whitespace-nowrap">
                {isoToDisplayDateTime(consumption.createdAt)}
              </TableCell>
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
                {/* Detalle del consumo (US-23), en un modal */}
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

      {openCode && (
        <ConsumptionDetailModal
          code={openCode}
          onClose={() => setOpenCode(null)}
          // Rutas relativas a /admin/clientes/:id: un feature no importa de app/
          onRegisterNew={(customer) =>
            navigate('../../../caja/cliente', { relative: 'path', state: customer })
          }
        />
      )}
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
    return <p className={emptyClass}>Este cliente todavía no tiene movimientos de puntos.</p>
  }

  const { total } = movements.data
  const totalPages = Math.ceil(total / MOVEMENTS_PAGE_SIZE)
  const start = (page - 1) * MOVEMENTS_PAGE_SIZE + 1
  const end = Math.min(page * MOVEMENTS_PAGE_SIZE, total)

  return (
    <>
      <Table variant="admin">
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
              <TableCell className="whitespace-nowrap">
                {isoToDisplayDateTime(movement.createdAt)}
              </TableCell>
              <TableCell>
                <Badge variant={movement.points < 0 ? 'danger' : 'success'}>
                  {POINTS_MOVEMENT_TYPES[movement.type]}
                </Badge>
              </TableCell>
              <TableCell>{movement.description}</TableCell>
              <TableCell
                className={cn(
                  'text-right font-bold tabular-nums',
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
          <span className="text-[13px] text-[#7a6e63]">
            Mostrando {start}–{end} de {total}
          </span>
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
