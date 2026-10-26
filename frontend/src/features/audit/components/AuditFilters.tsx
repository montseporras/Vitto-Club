import { DOCUMENT_TYPES } from '@/domain/documents'
import { Button } from '@/shared/components/ui/Button'
import { DateRangePicker } from '@/shared/components/ui/DateRangePicker'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
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

  return (
    <section
      aria-label="Filtros de auditoría"
      className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="audit-actor">
          Realizado por
        </label>
        <Select
          id="audit-actor"
          options={actorOptions}
          value={filters.actor}
          disabled={actorsLoading}
          onChange={(event) => onChange({ actor: event.target.value })}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="audit-module">
          Módulo
        </label>
        <Select
          id="audit-module"
          options={[
            { value: '', label: 'Todos' },
            ...AUDIT_MODULES.map((module) => ({
              value: module.value,
              label: module.label,
              disabled: module.disabled,
            })),
          ]}
          value={filters.module}
          onChange={(event) =>
            onChange({
              module: event.target.value as AuditModule | '',
              action: '',
            })
          }
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="audit-action">
          Acción
        </label>
        <Select
          id="audit-action"
          options={[
            { value: '', label: 'Todas' },
            ...actions.map((action) => ({
              value: action.value,
              label: action.label,
            })),
          ]}
          value={filters.action}
          disabled={!filters.module}
          onChange={(event) =>
            onChange({ action: event.target.value as AuditAction | '' })
          }
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="audit-document-type">
          Tipo doc.
        </label>
        <Select
          id="audit-document-type"
          options={DOCUMENT_OPTIONS}
          value={filters.documentType}
          onChange={(event) =>
            onChange({ documentType: event.target.value as AuditFiltersState['documentType'] })
          }
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="audit-document-number">
          N° doc. cliente
        </label>
        <Input
          id="audit-document-number"
          placeholder="30111222"
          maxLength={20}
          value={filters.documentNumber}
          onChange={(event) => onChange({ documentNumber: event.target.value })}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="audit-date-preset">
          Fecha
        </label>
        <Select
          id="audit-date-preset"
          options={DATE_OPTIONS}
          value={filters.datePreset}
          onChange={(event) =>
            onChange({ datePreset: event.target.value as AuditDatePreset })
          }
        />
      </div>

      {filters.datePreset === 'CUSTOM' && (
        <DateRangePicker
          id="audit-date-range"
          label="Rango de fechas"
          fromDate={filters.fromDate}
          toDate={filters.toDate}
          onApply={(fromDate, toDate) => onChange({ fromDate, toDate })}
        />
      )}

      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="button" variant="secondary" onClick={onClear}>
          Limpiar filtros
        </Button>
      </div>
    </section>
  )
}
