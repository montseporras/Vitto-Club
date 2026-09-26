import { DOCUMENT_TYPES } from '@/domain/documents'
import { Button } from '@/shared/components/ui/Button'
import { isoToDisplayDate } from '@/shared/lib/dates'
import { cn } from '@/shared/lib/utils'
import type { Client } from '../types/cliente'

const PENCIL = 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'

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

        <Button
          type="button"
          size="lg"
          onClick={onEdit}
          disabled={!client.active}
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
      </div>

      {!client.active && (
        <p className="mt-3 text-sm text-accent-800">
          Este cliente está dado de baja. Para editar sus datos, primero hay
          que reactivarlo.
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
