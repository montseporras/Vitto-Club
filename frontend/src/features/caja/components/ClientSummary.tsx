import { DOCUMENT_TYPES } from '@/domain/documents'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardTitle } from '@/shared/components/ui/Card'
import { DataList } from '@/shared/components/ui/DataList'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { isoToDisplayDate } from '@/shared/lib/dates'
import type { Client } from '../types/cliente'

type ClientSummaryProps = {
  client: Client
  onEdit: () => void
}

/** Datos del cliente encontrado, con el botón para pasar a editarlos. */
export function ClientSummary({ client, onEdit }: ClientSummaryProps) {
  const rows = [
    {
      label: 'Documento',
      value: `${DOCUMENT_TYPES[client.documentType].label} ${client.documentNumber}`,
    },
    { label: 'Correo electrónico', value: client.email },
    { label: 'Teléfono', value: client.phone ?? '—' },
    {
      label: 'Fecha de nacimiento',
      value: client.dateOfBirth ? isoToDisplayDate(client.dateOfBirth) : '—',
    },
  ]

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <CardTitle>
            {client.firstName} {client.lastName}
          </CardTitle>
          <Badge variant={client.active ? 'success' : 'danger'}>
            {client.active ? 'Activo' : 'Dado de baja'}
          </Badge>
        </div>

        <Button
          type="button"
          size="lg"
          onClick={onEdit}
          disabled={!client.active}
          className="w-full sm:w-auto"
        >
          <Icon d={ICONS.pencil} />
          Editar datos
        </Button>
      </div>

      {!client.active && (
        <p className="mt-3 text-sm text-accent-800">
          Este cliente está dado de baja. Para editar sus datos, primero hay
          que reactivarlo.
        </p>
      )}

      <DataList items={rows} className="mt-5" />
    </Card>
  )
}
