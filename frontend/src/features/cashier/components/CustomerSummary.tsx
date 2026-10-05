import { DOCUMENT_TYPES } from '@/domain/documents'
import { Badge } from '@/shared/components/ui/Badge'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardTitle } from '@/shared/components/ui/Card'
import { DataList } from '@/shared/components/ui/DataList'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { isoToDisplayDate } from '@/shared/lib/dates'
import { useActivateCustomer } from '../api/cashier.queries'
import type { Customer } from '../types/customer'

type CustomerSummaryProps = {
  customer: Customer
  onEdit: () => void
  onActivated: (customer: Customer) => void
}

/** Datos del cliente encontrado, con el botón para editarlos o, si está dado de baja, reactivarlo. */
export function CustomerSummary({ customer, onEdit, onActivated }: CustomerSummaryProps) {
  const activateCustomer = useActivateCustomer()

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
          <Badge variant={customer.active ? 'success' : 'danger'}>
            {customer.active ? 'Activo' : 'Dado de baja'}
          </Badge>
        </div>

        {customer.active ? (
          <Button
            type="button"
            size="lg"
            onClick={onEdit}
            className="w-full sm:w-auto"
          >
            <Icon d={ICONS.pencil} />
            Editar datos
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            onClick={() => activateCustomer.mutate(customer, { onSuccess: onActivated })}
            disabled={activateCustomer.isPending}
            className="w-full sm:w-auto"
          >
            <Icon d={ICONS.reload} />
            {activateCustomer.isPending ? 'Reactivando…' : 'Reactivar cuenta'}
          </Button>
        )}
      </div>

      {!customer.active && activateCustomer.isError && (
        <Alert variant="error" className="mt-3">
          No se pudo reactivar la cuenta.
          <AlertMessages messages={activateCustomer.error.messages} />
        </Alert>
      )}

      {!customer.active && !activateCustomer.isError && (
        <p className="mt-3 text-sm text-accent-800">
          Este cliente está dado de baja. Para editar sus datos, primero hay
          que reactivar su cuenta.
        </p>
      )}

      <DataList items={rows} className="mt-5" />
    </Card>
  )
}
