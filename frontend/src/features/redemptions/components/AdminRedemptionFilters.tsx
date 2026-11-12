// Filtros de la pantalla Canjes del Administrador (US-45, CA-45.7). Se aplican con "Filtrar";
// mientras tanto, la etiqueta dice "Sin aplicar". Es una barra unida de dos filas, como en el
// prototipo (GestionCanjes).
import type { FormEvent } from 'react'
import { DOCUMENT_TYPES, type DocumentType } from '@/domain/documents'
import { Button } from '@/shared/components/ui/Button'
import { DateRangePicker } from '@/shared/components/ui/DateRangePicker'
import {
  FilterActions,
  FilterBar,
  FilterCell,
  FilterRowDivider,
} from '@/shared/components/ui/FilterBar'
import { filterControlClass } from '@/shared/components/ui/filter-styles'
import { FilterSelect } from '@/shared/components/ui/FilterSelect'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import type { DraftRedemptionFilters } from '../lib/draft-filters'
import { REDEMPTION_STATUSES, REDEMPTION_STATUS_VALUES } from '../lib/format'
import type { RedemptionStatus } from '../types/redemption'

const DOCUMENT_TYPE_OPTIONS = Object.entries(DOCUMENT_TYPES).map(([value, { label }]) => ({
  value,
  label,
}))

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  ...REDEMPTION_STATUS_VALUES.map((value) => ({ value, label: REDEMPTION_STATUSES[value] })),
]

const ORDER_OPTIONS = [
  { value: 'desc', label: 'Más recientes' },
  { value: 'asc', label: 'Más antiguos' },
]

type AdminRedemptionFiltersProps = {
  draft: DraftRedemptionFilters
  onChange: (draft: DraftRedemptionFilters) => void
  hasPending: boolean
  busy: boolean
  onSubmit: () => void
}

export function AdminRedemptionFilters({
  draft,
  onChange,
  hasPending,
  busy,
  onSubmit,
}: AdminRedemptionFiltersProps) {
  const update = <TField extends keyof DraftRedemptionFilters>(
    field: TField,
    value: DraftRedemptionFilters[TField],
  ) => onChange({ ...draft, [field]: value })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <FilterBar onSubmit={submit} aria-label="Filtros de canjes">
      <FilterCell
        label="Tipo doc."
        htmlFor="redemption-document-type"
        flex="0.7 1 110px"
        divider={false}
      >
        <FilterSelect
          id="redemption-document-type"
          variant="bar"
          value={draft.documentType}
          options={DOCUMENT_TYPE_OPTIONS}
          onChange={(value) => update('documentType', value as DocumentType)}
        />
      </FilterCell>

      <FilterCell label="N° de documento" htmlFor="redemption-document-number" flex="1 1 150px">
        <input
          id="redemption-document-number"
          value={draft.documentNumber}
          maxLength={20}
          placeholder={draft.documentType === 'PASSPORT' ? 'AAB123456' : '38.456.123'}
          className={filterControlClass}
          onChange={(event) => update('documentNumber', event.target.value)}
        />
      </FilterCell>

      <FilterCell label="Código" htmlFor="redemption-code" flex="0.8 1 110px">
        <input
          id="redemption-code"
          value={draft.code}
          maxLength={10}
          placeholder="K7MP2X"
          className={`${filterControlClass} uppercase`}
          onChange={(event) => update('code', event.target.value.toUpperCase())}
        />
      </FilterCell>

      <FilterCell label="Recompensa" htmlFor="redemption-reward" flex="1.2 1 170px">
        <input
          id="redemption-reward"
          value={draft.rewardName}
          maxLength={80}
          placeholder="Nombre de la recompensa"
          className={filterControlClass}
          onChange={(event) => update('rewardName', event.target.value)}
        />
      </FilterCell>

      <FilterRowDivider />

      <FilterCell label="Estado" htmlFor="redemption-status" flex="0.9 1 140px" divider={false}>
        <FilterSelect
          id="redemption-status"
          variant="bar"
          value={draft.status}
          options={STATUS_OPTIONS}
          onChange={(value) => update('status', value as RedemptionStatus | '')}
        />
      </FilterCell>

      <FilterCell label="Fechas" htmlFor="redemption-date-range" flex="1.3 1 220px">
        <DateRangePicker
          id="redemption-date-range"
          label="Fechas"
          variant="bar"
          fromDate={draft.fromDate}
          toDate={draft.toDate}
          onApply={(fromDate, toDate) => onChange({ ...draft, fromDate, toDate })}
        />
      </FilterCell>

      <FilterCell label="Orden" htmlFor="redemption-order" flex="0.9 1 140px">
        <FilterSelect
          id="redemption-order"
          variant="bar"
          value={draft.order}
          options={ORDER_OPTIONS}
          onChange={(value) => update('order', value as 'desc' | 'asc')}
        />
      </FilterCell>

      <FilterActions pending={hasPending}>
        <Button type="submit" disabled={busy} className="h-9">
          <Icon d={ICONS.filter} className="size-[15px]" />
          Filtrar
        </Button>
      </FilterActions>
    </FilterBar>
  )
}
