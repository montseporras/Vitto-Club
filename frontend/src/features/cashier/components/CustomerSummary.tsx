import { DOCUMENT_TYPES } from '@/domain/documents'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardTitle } from '@/shared/components/ui/Card'
import { DataList } from '@/shared/components/ui/DataList'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { isoToDisplayDate } from '@/shared/lib/dates'
import type { Customer } from '../types/customer'

type CustomerSummaryProps = {
  customer: Customer
  onEdit: () => void
}

/** Datos del cliente encontrado (siempre activo) con el botón para editarlos. */
export function CustomerSummary({ customer, onEdit }: CustomerSummaryProps) {
  const rows = [
    {
      label: 'Documento',
      value: `${DOCUMENT_TYPES[customer.documentType].label} ${customer.documentNumber}`,
    },
    { label: 'Correo electrónico', value: customer.email },
    { label: 'Teléfono', value: customer.phone ?? '—' },
    {
      label: 'Fecha de nacimiento',
      value: customer.dateOfBirth ? isoToDisplayDate(customer.dateOfBirth) : '—',
    },
  ]

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <CardTitle>
            {customer.firstName} {customer.lastName}
          </CardTitle>
          <Badge variant="success">Activo</Badge>
        </div>

        <Button
          type="button"
          size="lg"
          onClick={onEdit}
          className="w-full sm:w-auto"
        >
          <Icon d={ICONS.pencil} />
          Editar datos
        </Button>
      </div>

      <DataList items={rows} className="mt-5" />
    </Card>
  )
}
