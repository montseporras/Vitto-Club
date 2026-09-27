import { DOCUMENT_TYPES } from '@/domain/documents'
import { Alert } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { isoToDisplayDate } from '@/shared/lib/dates'
import { cn } from '@/shared/lib/utils'
import { useActivateClient } from '../api/caja.queries'
import type { Client } from '../types/cliente'

const PENCIL = 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'
const RELOAD = 'M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5'

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
    <article className="rounded-2xl border border-accent-200 bg-accent-50/60 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h3 className="text-2xl leading-tight">
            {client.firstName} {client.lastName}
          </h3>
          <span
            className={cn(
              'w-fit rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-wide',
              client.active
                ? 'border-olive/40 bg-olive-50 text-olive-800'
                : 'border-accent-600/40 bg-accent-100 text-accent-800',
            )}
          >
            {client.active ? 'Activo' : 'Dado de baja'}
          </span>
        </div>

        {client.active ? (
          <Button
            type="button"
            size="lg"
            onClick={onEdit}
            className="w-full sm:w-auto"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="size-5"
            >
              <path d={PENCIL} />
            </svg>
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
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="size-5"
            >
              <path d={RELOAD} />
            </svg>
            {activateClient.isPending ? 'Reactivando…' : 'Reactivar cuenta'}
          </Button>
        )}
      </div>

      {!client.active && activateClient.isError && (
        <Alert variant="error" className="mt-3">
          No se pudo reactivar la cuenta.
          {activateClient.error.messages.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {activateClient.error.messages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}

      {!client.active && !activateClient.isError && (
        <p className="mt-3 text-sm text-accent-800">
          Este cliente está dado de baja. Para editar sus datos, primero hay
          que reactivar su cuenta.
        </p>
      )}

      <dl className="mt-5 grid gap-x-6 gap-y-4 border-t border-accent-200 pt-5 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5">
            <dt className="text-xs font-bold uppercase tracking-wide text-accent-800">
              {row.label}
            </dt>
            <dd className="text-base break-words text-text">{row.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  )
}
