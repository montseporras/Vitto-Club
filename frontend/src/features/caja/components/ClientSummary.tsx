import { DOCUMENT_TYPES } from '@/domain/documents'
import { Badge } from '@/shared/components/ui/Badge'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardTitle } from '@/shared/components/ui/Card'
import { DataList } from '@/shared/components/ui/DataList'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { isoToDisplayDate } from '@/shared/lib/dates'
import { useActivateClient } from '../api/caja.queries'
import type { Client } from '../types/cliente'

type ClientSummaryProps = {
  client: Client
  onEdit: () => void
  onActivated: (client: Client) => void
}

/** Datos del cliente encontrado, con el botón para editarlos o, si está dado de baja, reactivarlo. */
export function ClientSummary({ client, onEdit, onActivated }: ClientSummaryProps) {
  const activateClient = useActivateClient()

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

        {client.active ? (
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
            onClick={() => activateClient.mutate(client, { onSuccess: onActivated })}
            disabled={activateClient.isPending}
            className="w-full sm:w-auto"
          >
            <Icon d={ICONS.reload} />
            {activateClient.isPending ? 'Reactivando…' : 'Reactivar cuenta'}
          </Button>
        )}
      </div>

      {!client.active && activateClient.isError && (
        <Alert variant="error" className="mt-3">
          No se pudo reactivar la cuenta.
          <AlertMessages messages={activateClient.error.messages} />
        </Alert>
      )}

      {!client.active && !activateClient.isError && (
        <p className="mt-3 text-sm text-accent-800">
          Este cliente está dado de baja. Para editar sus datos, primero hay
          que reactivar su cuenta.
        </p>
      )}

      <DataList items={rows} className="mt-5" />
    </Card>
  )
}
