// Filtros de la pantalla Canjes del Administrador (US-45, CA-45.7). Se aplican con "Filtrar";
// mientras tanto, la etiqueta dice "Sin aplicar".
import type { FormEvent } from 'react'
import { DOCUMENT_TYPES, type DocumentType } from '@/domain/documents'
import { FormField } from '@/shared/components/forms/FormField'
import { Button } from '@/shared/components/ui/Button'
import { DateRangePicker } from '@/shared/components/ui/DateRangePicker'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
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
    <form
      onSubmit={submit}
      className="mt-6 grid gap-4 rounded-xl border border-orange-200 p-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <FormField id="redemption-document-type" label="Tipo doc." hideRequiredMark>
        <Select
          id="redemption-document-type"
          value={draft.documentType}
          options={DOCUMENT_TYPE_OPTIONS}
          onChange={(event) => update('documentType', event.target.value as DocumentType)}
        />
      </FormField>

      <FormField id="redemption-document-number" label="N° de documento" hideRequiredMark>
        <Input
          id="redemption-document-number"
          value={draft.documentNumber}
          maxLength={20}
          placeholder={draft.documentType === 'PASSPORT' ? 'AAB123456' : '38.456.123'}
          onChange={(event) => update('documentNumber', event.target.value)}
        />
      </FormField>

      <FormField id="redemption-code" label="Código" hideRequiredMark>
        <Input
          id="redemption-code"
          value={draft.code}
          maxLength={10}
          placeholder="K7MP2X"
          className="uppercase"
          onChange={(event) => update('code', event.target.value.toUpperCase())}
        />
      </FormField>

      <FormField id="redemption-reward" label="Recompensa" hideRequiredMark>
        <Input
          id="redemption-reward"
          value={draft.rewardName}
          maxLength={80}
          placeholder="Nombre de la recompensa"
          onChange={(event) => update('rewardName', event.target.value)}
        />
      </FormField>

      <FormField id="redemption-status" label="Estado" hideRequiredMark>
        <Select
          id="redemption-status"
          value={draft.status}
          options={STATUS_OPTIONS}
          onChange={(event) => update('status', event.target.value as RedemptionStatus | '')}
        />
      </FormField>

      <DateRangePicker
        id="redemption-date-range"
        label="Fechas"
        fromDate={draft.fromDate}
        toDate={draft.toDate}
        onApply={(fromDate, toDate) => onChange({ ...draft, fromDate, toDate })}
      />

      <FormField id="redemption-order" label="Orden" hideRequiredMark>
        <Select
          id="redemption-order"
          value={draft.order}
          options={ORDER_OPTIONS}
          onChange={(event) => update('order', event.target.value as 'desc' | 'asc')}
        />
      </FormField>

      <div className="flex items-end justify-end">
        {hasPending && <span className="mr-2 pb-2 text-sm text-accent-700">Sin aplicar</span>}
        <Button type="submit" size="md" disabled={busy}>
          <Icon d={ICONS.filter} />
          Filtrar
        </Button>
      </div>
    </form>
  )
}
