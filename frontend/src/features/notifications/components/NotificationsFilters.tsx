// Filtros del historial de notificaciones (US-14, CA-14.6, contrato S5 §3.8.4): Tipo, Estado, documento
// del cliente y Fechas (un solo campo con calendario, como el de Consumos; S5-40). Como en el
// prototipo, se aplican al cambiarlos (no hay botón "Filtrar") y "Limpiar filtros" los vuelve a cero.
import { DOCUMENT_TYPES, type DocumentType } from '@/domain/documents'
import { Button } from '@/shared/components/ui/Button'
import { DateRangePicker } from '@/shared/components/ui/DateRangePicker'
import { FilterBar, FilterCell, FilterRowDivider } from '@/shared/components/ui/FilterBar'
import { filterControlClass } from '@/shared/components/ui/filter-styles'
import { FilterSelect } from '@/shared/components/ui/FilterSelect'
import { NOTIFICATION_STATUSES, NOTIFICATION_TYPES } from '../lib/notification-labels'
import {
  EMPTY_NOTIFICATIONS_FILTERS,
  type NotificationsFiltersState,
} from '../lib/notifications-filters'
import type { NotificationStatus, NotificationType } from '../types/notifications'

const TYPE_OPTIONS = [
  { value: '', label: 'Todos' },
  ...Object.entries(NOTIFICATION_TYPES).map(([value, label]) => ({ value, label })),
]

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  ...Object.entries(NOTIFICATION_STATUSES).map(([value, label]) => ({ value, label })),
]

const DOCUMENT_TYPE_OPTIONS = Object.entries(DOCUMENT_TYPES).map(([value, { label }]) => ({ value, label }))

type NotificationsFiltersProps = {
  filters: NotificationsFiltersState
  onChange: (filters: NotificationsFiltersState) => void
}

export function NotificationsFilters({ filters, onChange }: NotificationsFiltersProps) {
  const update = <TField extends keyof NotificationsFiltersState>(
    field: TField,
    value: NotificationsFiltersState[TField],
  ) => onChange({ ...filters, [field]: value })

  return (
    <FilterBar onSubmit={(event) => event.preventDefault()} aria-label="Filtros del historial">
      <FilterCell label="Tipo" htmlFor="notification-type" flex="1 1 170px" divider={false}>
        <FilterSelect
          id="notification-type"
          variant="bar"
          value={filters.type}
          options={TYPE_OPTIONS}
          onChange={(value) => update('type', value as NotificationType | '')}
        />
      </FilterCell>

      <FilterCell label="Estado" htmlFor="notification-status" flex="1 1 140px">
        <FilterSelect
          id="notification-status"
          variant="bar"
          value={filters.status}
          options={STATUS_OPTIONS}
          onChange={(value) => update('status', value as NotificationStatus | '')}
        />
      </FilterCell>

      <FilterCell label="Documento del cliente" htmlFor="notification-document-number" flex="1.3 1 220px">
        <div className="flex items-center gap-2">
          <label htmlFor="notification-document-type" className="sr-only">
            Tipo de documento
          </label>
          <FilterSelect
            id="notification-document-type"
            variant="bar"
            value={filters.documentType}
            options={DOCUMENT_TYPE_OPTIONS}
            className="w-28 shrink-0"
            onChange={(value) => update('documentType', value as DocumentType)}
          />
          <input
            id="notification-document-number"
            value={filters.documentNumber}
            maxLength={20}
            placeholder="Número"
            className={`${filterControlClass} min-w-0 flex-1`}
            onChange={(event) => update('documentNumber', event.target.value)}
          />
        </div>
      </FilterCell>

      <FilterRowDivider />

      <FilterCell label="Fechas" htmlFor="notification-date-range" flex="1 1 260px" divider={false}>
        <DateRangePicker
          id="notification-date-range"
          label="Fechas"
          variant="bar"
          fromDate={filters.fromDate}
          toDate={filters.toDate}
          onApply={(fromDate, toDate) => onChange({ ...filters, fromDate, toDate })}
        />
      </FilterCell>

      <div className="flex items-center border-l border-[#f6d0b1] px-3.5 py-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(EMPTY_NOTIFICATIONS_FILTERS)}>
          Limpiar filtros
        </Button>
      </div>
    </FilterBar>
  )
}
