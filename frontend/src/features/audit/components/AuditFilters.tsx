import { DOCUMENT_TYPES } from '@/domain/documents'
import { Button } from '@/shared/components/ui/Button'
import { DateRangePicker } from '@/shared/components/ui/DateRangePicker'
import {
  FilterActions,
  FilterBar,
  FilterCell,
  FilterRowDivider,
} from '@/shared/components/ui/FilterBar'
import { FilterSelect } from '@/shared/components/ui/FilterSelect'
import { filterControlClass } from '@/shared/components/ui/filter-styles'
import { AUDIT_ACTIONS_BY_MODULE, AUDIT_MODULES } from '../types/audit'
import type { AuditActor, AuditAction, AuditModule } from '../types/audit'

export type AuditDatePreset = 'ANY' | 'TODAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'CUSTOM'

export type AuditFiltersState = {
  actor: string
  module: AuditModule | ''
  action: AuditAction | ''
  documentType: 'DNI' | 'PASSPORT'
  documentNumber: string
  datePreset: AuditDatePreset
  fromDate: string
  toDate: string
}

type AuditFiltersProps = {
  filters: AuditFiltersState
  actors: AuditActor[]
  actorsLoading: boolean
  onChange: (filters: Partial<AuditFiltersState>) => void
  onClear: () => void
}

const DATE_OPTIONS = [
  { value: 'ANY', label: 'Cualquiera' },
  { value: 'TODAY', label: 'Hoy' },
  { value: 'LAST_7_DAYS', label: 'Últimos 7 días' },
  { value: 'THIS_MONTH', label: 'Este mes' },
  { value: 'CUSTOM', label: 'Rango personalizado' },
]

const DOCUMENT_OPTIONS = [
  { value: 'DNI', label: DOCUMENT_TYPES.DNI.label },
  { value: 'PASSPORT', label: DOCUMENT_TYPES.PASSPORT.label },
]

export function AuditFilters({
  filters,
  actors,
  actorsLoading,
  onChange,
  onClear,
}: AuditFiltersProps) {
  const actions = filters.module ? AUDIT_ACTIONS_BY_MODULE[filters.module] : []
  const actorOptions = [
    { value: '', label: 'Todos' },
    ...actors.map((actor) => ({
      value: String(actor.accountId),
      label: actor.name,
    })),
    { value: 'SYSTEM', label: 'Sistema' },
  ]

  const moduleOptions = [
    { value: '', label: 'Todos' },
    ...AUDIT_MODULES.map((module) => ({
      value: module.value,
      label: module.label,
      disabled: module.disabled,
    })),
  ]
  const actionOptions = [
    { value: '', label: 'Todas' },
    ...actions.map((action) => ({ value: action.value, label: action.label })),
  ]

  // Barra unida, igual que Canjes y Consumos. Los filtros se aplican al cambiarlos, así que no
  // lleva botón "Filtrar": solo "Limpiar filtros".
  return (
    <FilterBar onSubmit={(event) => event.preventDefault()} aria-label="Filtros de auditoría">
      <FilterCell label="Realizado por" htmlFor="audit-actor" flex="1.2 1 170px" divider={false}>
        <FilterSelect
          id="audit-actor"
          variant="bar"
          value={filters.actor}
          options={actorOptions}
          disabled={actorsLoading}
          onChange={(value) => onChange({ actor: value })}
        />
      </FilterCell>

      <FilterCell label="Módulo" htmlFor="audit-module" flex="1 1 140px">
        <FilterSelect
          id="audit-module"
          variant="bar"
          value={filters.module}
          options={moduleOptions}
          onChange={(value) => onChange({ module: value as AuditModule | '', action: '' })}
        />
      </FilterCell>

      <FilterCell label="Acción" htmlFor="audit-action" flex="1 1 140px">
        <FilterSelect
          id="audit-action"
          variant="bar"
          value={filters.action}
          options={actionOptions}
          disabled={!filters.module}
          onChange={(value) => onChange({ action: value as AuditAction | '' })}
        />
      </FilterCell>

      <FilterRowDivider />

      <FilterCell label="Tipo doc." htmlFor="audit-document-type" flex="0.7 1 110px" divider={false}>
        <FilterSelect
          id="audit-document-type"
          variant="bar"
          value={filters.documentType}
          options={DOCUMENT_OPTIONS}
          onChange={(value) => onChange({ documentType: value as AuditFiltersState['documentType'] })}
        />
      </FilterCell>

      <FilterCell label="N° doc. cliente" htmlFor="audit-document-number" flex="1 1 150px">
        <input
          id="audit-document-number"
          className={filterControlClass}
          placeholder="30111222"
          maxLength={20}
          value={filters.documentNumber}
          onChange={(event) => onChange({ documentNumber: event.target.value })}
        />
      </FilterCell>

      <FilterCell label="Fecha" htmlFor="audit-date-preset" flex="1 1 160px">
        <FilterSelect
          id="audit-date-preset"
          variant="bar"
          value={filters.datePreset}
          options={DATE_OPTIONS}
          onChange={(value) => onChange({ datePreset: value as AuditDatePreset })}
        />
      </FilterCell>

      {filters.datePreset === 'CUSTOM' && (
        <FilterCell label="Rango de fechas" htmlFor="audit-date-range" flex="1.3 1 220px">
          <DateRangePicker
            id="audit-date-range"
            label="Rango de fechas"
            variant="bar"
            fromDate={filters.fromDate}
            toDate={filters.toDate}
            onApply={(fromDate, toDate) => onChange({ fromDate, toDate })}
          />
        </FilterCell>
      )}

      <FilterActions>
        <Button type="button" variant="secondary" onClick={onClear} className="h-9">
          Limpiar filtros
        </Button>
      </FilterActions>
    </FilterBar>
  )
}
