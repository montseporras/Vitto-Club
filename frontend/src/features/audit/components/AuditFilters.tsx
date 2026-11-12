import { DOCUMENT_TYPES } from '@/domain/documents'
import { Button } from '@/shared/components/ui/Button'
import { DateRangePicker } from '@/shared/components/ui/DateRangePicker'
import { LooseField } from '@/shared/components/ui/FilterBar'
import { FilterSelect } from '@/shared/components/ui/FilterSelect'
import { looseInputClass } from '@/shared/components/ui/filter-styles'
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

  // Campos sueltos en una grilla que se acomoda sola, como en el prototipo (Auditoria.html)
  return (
    <section
      aria-label="Filtros de auditoría"
      className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] items-end gap-2.5"
    >
      <LooseField label="Realizado por" htmlFor="audit-actor">
        <FilterSelect
          id="audit-actor"
          variant="field"
          value={filters.actor}
          options={actorOptions}
          disabled={actorsLoading}
          onChange={(value) => onChange({ actor: value })}
        />
      </LooseField>

      <LooseField label="Módulo" htmlFor="audit-module">
        <FilterSelect
          id="audit-module"
          variant="field"
          value={filters.module}
          options={moduleOptions}
          onChange={(value) => onChange({ module: value as AuditModule | '', action: '' })}
        />
      </LooseField>

      <LooseField label="Acción" htmlFor="audit-action">
        <FilterSelect
          id="audit-action"
          variant="field"
          value={filters.action}
          options={actionOptions}
          disabled={!filters.module}
          onChange={(value) => onChange({ action: value as AuditAction | '' })}
        />
      </LooseField>

      <LooseField label="Tipo doc." htmlFor="audit-document-type">
        <FilterSelect
          id="audit-document-type"
          variant="field"
          value={filters.documentType}
          options={DOCUMENT_OPTIONS}
          onChange={(value) => onChange({ documentType: value as AuditFiltersState['documentType'] })}
        />
      </LooseField>

      <LooseField label="N° doc. cliente" htmlFor="audit-document-number">
        <input
          id="audit-document-number"
          className={looseInputClass}
          placeholder="30111222"
          maxLength={20}
          value={filters.documentNumber}
          onChange={(event) => onChange({ documentNumber: event.target.value })}
        />
      </LooseField>

      <LooseField label="Fecha" htmlFor="audit-date-preset">
        <FilterSelect
          id="audit-date-preset"
          variant="field"
          value={filters.datePreset}
          options={DATE_OPTIONS}
          onChange={(value) => onChange({ datePreset: value as AuditDatePreset })}
        />
      </LooseField>

      {filters.datePreset === 'CUSTOM' && (
        <div className="col-span-2 min-w-0">
          <DateRangePicker
            id="audit-date-range"
            label="Rango de fechas"
            fromDate={filters.fromDate}
            toDate={filters.toDate}
            onApply={(fromDate, toDate) => onChange({ fromDate, toDate })}
          />
        </div>
      )}

      <div className="flex items-end">
        <Button type="button" variant="secondary" onClick={onClear}>
          Limpiar filtros
        </Button>
      </div>
    </section>
  )
}
