// Pestaña "Historial" de Configuración → Notificaciones (US-14, CA-14.6 y CA-14.8, contrato S5 §3.8.4 y
// §3.8.5): filtros, la tabla de notificaciones de a 20 y "Reenviar" en las FAILED que todavía no se
// reenviaron. El éxito de "Reenviar" va en el toast, como en el prototipo; el error, en un aviso rojo
// arriba de la tabla, como en el resto de la app (decisión de Melisa).
import { ICONS } from '@/shared/components/ui/icons'
import { EmptyState } from '@/shared/components/feedback/EmptyState'
import { useDeferredValue, useState } from 'react'
import { DOCUMENT_TYPES } from '@/domain/documents'
import { toApiError } from '@/shared/api/ApiError'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { useToast } from '@/shared/components/feedback/useToast'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { RangePagination } from '@/shared/components/ui/Pagination'
import {
  Table,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/shared/components/ui/Table'
import { isoToDisplayDateTime } from '@/shared/lib/dates'
import { NOTIFICATIONS_PAGE_SIZE } from '../api/notifications.api'
import { useNotifications, useResendNotification } from '../api/notifications.queries'
import { NOTIFICATION_STATUSES, NOTIFICATION_TYPES, STATUS_BADGE } from '../lib/notification-labels'
import type { NotificationRecord } from '../types/notifications'
import {
  EMPTY_NOTIFICATIONS_FILTERS,
  type NotificationsFiltersState,
} from '../lib/notifications-filters'
import { NotificationsFilters } from './NotificationsFilters'

// El mensaje del backend (404 y los dos 409 de §3.8.5), o uno genérico
function resendErrorMessages(error: unknown): string[] {
  const apiError = toApiError(error)
  if (apiError.messages.length > 0) return apiError.messages
  return ['No se pudo reenviar el correo. Intentá nuevamente.']
}

// Debajo del estado: "Reenvío de un correo que falló." o "Ya se reenvió." (§3.8.4)
const resendNote = (row: NotificationRecord) =>
  row.resentFromId !== null ? 'Reenvío de un correo que falló.' : row.resent ? 'Ya se reenvió.' : null

export function HistoryTab() {
  const toast = useToast()
  const [filters, setFilters] = useState<NotificationsFiltersState>(EMPTY_NOTIFICATIONS_FILTERS)
  const [page, setPage] = useState(1)
  // Error del último "Reenviar"; se borra con el próximo reenvío o al cambiar los filtros o la página
  const [resendError, setResendError] = useState<string[] | null>(null)
  // El número de documento se escribe de a una letra: se espera a que React esté libre para pedir
  const deferredFilters = useDeferredValue(filters)

  const history = useNotifications({
    type: deferredFilters.type || undefined,
    status: deferredFilters.status || undefined,
    documentType: deferredFilters.documentType,
    documentNumber: deferredFilters.documentNumber,
    fromDate: deferredFilters.fromDate || undefined,
    toDate: deferredFilters.toDate || undefined,
    page,
  })
  const resend = useResendNotification()

  const changeFilters = (next: NotificationsFiltersState) => {
    setFilters(next)
    setPage(1)
    setResendError(null)
  }

  const changePage = (next: number) => {
    setPage(next)
    setResendError(null)
  }

  const resendRow = (row: NotificationRecord) => {
    setResendError(null)
    resend.mutate(row.id, {
      onSuccess: () => toast(`Correo reenviado a ${row.recipient}.`),
      onError: (error) => setResendError(resendErrorMessages(error)),
    })
  }

  const items = history.data?.items ?? []

  return (
    <div className="flex flex-col gap-4">
      <NotificationsFilters filters={filters} onChange={changeFilters} />

      {resendError && (
        <Alert variant="error">
          <AlertMessages messages={resendError} />
        </Alert>
      )}

      {history.isLoading && <StatusText>Cargando notificaciones…</StatusText>}

      {history.isError && (
        <Alert variant="error">
          <p>
            No se pudo cargar el historial.{' '}
            <button
              type="button"
              onClick={() => void history.refetch()}
              className="cursor-pointer font-semibold underline underline-offset-2"
            >
              Reintentar
            </button>
          </p>
        </Alert>
      )}

      {history.data && items.length === 0 && (
        <EmptyState
          icon={ICONS.bell}
          title="No hay notificaciones con esos filtros"
          description="Probá con otro tipo, estado o rango de fechas."
          action={
            <Button type="button" variant="secondary" onClick={() => changeFilters(EMPTY_NOTIFICATIONS_FILTERS)}>
              Limpiar filtros
            </Button>
          }
        />
      )}

      {history.data && items.length > 0 && (
        <>
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Fecha y hora</TableHeaderCell>
                <TableHeaderCell>Tipo</TableHeaderCell>
                <TableHeaderCell>Cliente</TableHeaderCell>
                <TableHeaderCell>Destinatario</TableHeaderCell>
                <TableHeaderCell>Estado</TableHeaderCell>
                <TableHeaderCell>
                  <span className="sr-only">Acciones</span>
                </TableHeaderCell>
              </tr>
            </TableHead>
            <tbody>
              {items.map((row) => {
                const note = resendNote(row)
                return (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">{isoToDisplayDateTime(row.createdAt)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {NOTIFICATION_TYPES[row.type]}
                      <div className="max-w-[240px] truncate text-xs text-[#7a6e63]" title={row.subject}>
                        {row.subject}
                      </div>
                    </TableCell>
                    <TableCell>
                      <strong>
                        {row.customer.firstName} {row.customer.lastName}
                      </strong>
                      <div className="text-xs text-[#7a6e63]">
                        {DOCUMENT_TYPES[row.customer.documentType].label} {row.customer.documentNumber}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{row.recipient}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[row.status]} title={row.error ?? undefined}>
                        {NOTIFICATION_STATUSES[row.status]}
                      </Badge>
                      {row.error && <div className="max-w-[220px] text-xs text-[#a8532a]">{row.error}</div>}
                      {note && <div className="max-w-[220px] text-xs text-[#7a6e63]">{note}</div>}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {row.status === 'FAILED' && !row.resent && (
                        <Button size="sm" loading={resend.isPending && resend.variables === row.id}
                          type="button"
                          variant="secondary"
                          disabled={resend.isPending && resend.variables === row.id}
                          onClick={() => resendRow(row)}
                        >
                          Reenviar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </tbody>
          </Table>

          <RangePagination
            page={history.data.page}
            total={history.data.total}
            pageSize={history.data.limit || NOTIFICATIONS_PAGE_SIZE}
            onChange={changePage}
            disabled={history.isFetching}
          />
        </>
      )}
    </div>
  )
}
