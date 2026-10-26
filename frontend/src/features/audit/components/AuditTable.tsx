import { DOCUMENT_TYPES } from '@/domain/documents'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import {
  Table,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/shared/components/ui/Table'
import { formatDateTimeInTimeZone } from '@/shared/lib/dates'
import { AUDIT_MODULES } from '../types/audit'
import type { AuditEntry, AuditResponse } from '../types/audit'

const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires'
const SYSTEM_ICON =
  'M4 4h16v12H4z M8 20h8 M12 16v4 M8 8h.01 M12 8h4'

type AuditTableProps = {
  result: AuditResponse
  expandedId: number | null
  onToggle: (entry: AuditEntry) => void
  onPageChange: (page: number) => void
}

function moduleLabel(module: AuditEntry['module']) {
  return AUDIT_MODULES.find((item) => item.value === module)?.label ?? module
}

function ActorIcon({ actorType }: { actorType: AuditEntry['actorType'] }) {
  return (
    <Icon
      d={actorType === 'EMPLOYEE' ? ICONS.user : SYSTEM_ICON}
      aria-hidden="true"
      className="size-4 shrink-0 text-orange-900"
    />
  )
}

function AuditDetails({ entry }: { entry: AuditEntry }) {
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-4 bg-orange-50/60 px-4 py-4 sm:pl-12">
      {entry.affectedCustomer && (
        <section className="min-w-52">
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-orange-900">
            Cliente afectado
          </h3>
          <p className="text-sm font-semibold">{entry.affectedCustomer.name}</p>
          <p className="text-sm">
            {DOCUMENT_TYPES[entry.affectedCustomer.documentType].label}{' '}
            {entry.affectedCustomer.documentNumber}
          </p>
        </section>
      )}

      <section className="min-w-56 flex-1">
        <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-orange-900">
          Detalle
        </h3>
        {entry.details.length === 0 ? (
          <p className="text-sm text-stone-600">Sin datos adicionales.</p>
        ) : (
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
            {entry.details.map((detail, index) => (
              <div key={`${detail.label}-${index}`} className="contents">
                <dt className="text-stone-600">{detail.label}</dt>
                <dd className="font-semibold">{detail.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </div>
  )
}

export function AuditTable({
  result,
  expandedId,
  onToggle,
  onPageChange,
}: AuditTableProps) {
  const firstItem = result.items.length > 0 ? (result.page - 1) * result.limit + 1 : 0
  const lastItem = Math.min(result.page * result.limit, result.total)
  const pageCount = Math.max(1, Math.ceil(result.total / result.limit))

  return (
    <>
      {result.items.length === 0 ? (
        <p className="py-8 text-center text-sm text-stone-600">
          No hay registros para los filtros seleccionados
        </p>
      ) : (
        <>
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell aria-label="Detalle" className="w-10" />
                <TableHeaderCell>Fecha y hora</TableHeaderCell>
                <TableHeaderCell>Realizado por</TableHeaderCell>
                <TableHeaderCell>Módulo</TableHeaderCell>
                <TableHeaderCell>Acción</TableHeaderCell>
              </tr>
            </TableHead>
            <tbody>
              {result.items.map((entry) => {
                const isExpanded = expandedId === entry.id
                return (
                  <AuditEntryRows
                    key={entry.id}
                    entry={entry}
                    isExpanded={isExpanded}
                    onToggle={() => onToggle(entry)}
                  />
                )
              })}
            </tbody>
          </Table>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
            <p aria-live="polite" className="text-sm text-stone-600">
              Mostrando {firstItem}–{lastItem} de {result.total}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={result.page <= 1}
                onClick={() => onPageChange(result.page - 1)}
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={result.page >= pageCount}
                onClick={() => onPageChange(result.page + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function AuditEntryRows({
  entry,
  isExpanded,
  onToggle,
}: {
  entry: AuditEntry
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <>
      <TableRow
        interactive
        aria-expanded={isExpanded}
        onClick={onToggle}
        className="cursor-pointer"
      >
        <TableCell>
          <button
            type="button"
            aria-label={`${isExpanded ? 'Ocultar' : 'Mostrar'} detalle de ${entry.description}`}
            aria-expanded={isExpanded}
            onClick={(event) => {
              event.stopPropagation()
              onToggle()
            }}
            className="rounded p-1 text-orange-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-700"
          >
            <Icon
              d={ICONS.chevronRight}
              aria-hidden="true"
              className={`size-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
          </button>
        </TableCell>
        <TableCell className="whitespace-nowrap">
          {formatDateTimeInTimeZone(entry.createdAt, ARGENTINA_TIME_ZONE)}
        </TableCell>
        <TableCell>
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <ActorIcon actorType={entry.actorType} />
            {entry.performedBy}
          </span>
        </TableCell>
        <TableCell>
          <Badge variant="neutral">{moduleLabel(entry.module)}</Badge>
        </TableCell>
        <TableCell>{entry.description}</TableCell>
      </TableRow>
      {isExpanded && (
        <tr>
          <td colSpan={5} className="p-0">
            <AuditDetails entry={entry} />
          </td>
        </tr>
      )}
    </>
  )
}
