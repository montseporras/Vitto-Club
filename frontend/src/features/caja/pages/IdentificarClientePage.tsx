import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router'
import { PATHS } from '@/app/router/paths'
import logoIso from '@/assets/logo-vitto-iso-white.png'
import { DOCUMENT_TYPES, DOCUMENT_TYPE_VALUES } from '@/domain/documents'
import { FormField } from '@/shared/components/forms/FormField'
import { SegmentedRadio } from '@/shared/components/forms/SegmentedRadio'
import { Alert } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import {
  useClientByDocument,
  type DocumentSearch,
} from '../api/caja.queries'
import { ClientSummary } from '../components/ClientSummary'
import { EditClientForm } from '../components/EditClientForm'
import {
  buscarClienteSchema,
  type BuscarClienteFormInput,
  type BuscarClienteFormOutput,
} from '../schemas/buscar-cliente.schema'
import type { Client } from '../types/cliente'

const DOCUMENT_OPTIONS = DOCUMENT_TYPE_VALUES.map((type) => ({
  value: type,
  label: DOCUMENT_TYPES[type].label,
}))

const SEARCH_ICON = 'm21 21-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z'

/** Cliente: el Cajero busca al cliente por documento y, si hace falta, edita sus datos (RF-016). */
export function IdentificarClientePage() {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<BuscarClienteFormInput, unknown, BuscarClienteFormOutput>({
    resolver: zodResolver(buscarClienteSchema),
    defaultValues: { documentType: 'DNI', documentNumber: '' },
  })
  const [search, setSearch] = useState<DocumentSearch | null>(null)
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState<Client | null>(null)
  const result = useClientByDocument(search)

  const onSearch = (data: BuscarClienteFormOutput) => {
    setEditing(false)
    setSaved(null)
    const sameSearch =
      search?.documentType === data.documentType &&
      search.documentNumber === data.documentNumber
    // Misma búsqueda: se vuelve a pedir para no mostrar datos viejos
    if (sameSearch) result.refetch()
    else setSearch(data)
  }

  const onSaved = (client: Client) => {
    setSaved(client)
    setEditing(false)
    // Si cambió el documento, la búsqueda sigue al cliente con el documento nuevo
    setSearch({
      documentType: client.documentType,
      documentNumber: client.documentNumber,
    })
    setValue('documentType', client.documentType)
    setValue('documentNumber', client.documentNumber)
  }

  const isDni = useWatch({ control, name: 'documentType' }) === 'DNI'
  const notFound = result.isError && result.error.status === 404

  return (
    <section className="mx-auto w-full max-w-4xl">
      {saved && (
        <Alert variant="success" className="mb-5">
          <p>
            Datos actualizados:{' '}
            <strong>
              {saved.firstName} {saved.lastName}
            </strong>{' '}
            ({DOCUMENT_TYPES[saved.documentType].label} {saved.documentNumber}).
          </p>
        </Alert>
      )}

      <div className="overflow-hidden rounded-3xl border border-accent-200 bg-surface shadow-xl shadow-accent-800/10 xl:grid xl:grid-cols-[17rem_1fr]">
        <header className="relative overflow-hidden bg-accent-700 px-6 py-7 text-white sm:px-8 xl:py-10">
          <img
            src={logoIso}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute right-6 bottom-8 hidden h-48 w-auto opacity-20 xl:block"
          />
          <p className="text-xs font-bold uppercase tracking-[0.18em]">
            Clientes
          </p>
          <h2 className="mt-2 text-3xl leading-tight sm:text-4xl">
            Cliente
          </h2>
          <p className="mt-3 max-w-xs text-base">
            Buscá al cliente por su documento para ver y editar sus datos.
          </p>
        </header>

        <div className="px-5 py-6 sm:px-8 sm:py-8">
          <form
            noValidate
            role="search"
            onSubmit={handleSubmit(onSearch)}
            className="grid gap-5 sm:grid-cols-2"
          >
            <SegmentedRadio
              legend="Tipo de documento"
              options={DOCUMENT_OPTIONS}
              field={register('documentType')}
            />

            <FormField
              id="search-documentNumber"
              label="Número de documento"
              error={errors.documentNumber?.message}
            >
              <div className="flex gap-2">
                <Input
                  id="search-documentNumber"
                  autoFocus
                  inputMode={isDni ? 'numeric' : 'text'}
                  placeholder="30111222"
                  autoComplete="off"
                  aria-invalid={errors.documentNumber ? true : undefined}
                  aria-describedby={
                    errors.documentNumber
                      ? 'search-documentNumber-error'
                      : undefined
                  }
                  {...register('documentNumber')}
                />
                <Button
                  type="submit"
                  size="lg"
                  disabled={result.isFetching}
                  className="shrink-0 px-5"
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
                    <path d={SEARCH_ICON} />
                  </svg>
                  Buscar
                </Button>
              </div>
            </FormField>
          </form>

          <div className="mt-7 border-t border-accent-100 pt-7" aria-live="polite">
            {!search && (
              <p className="text-base text-neutral-700">
                Ingresá el tipo y número de documento para buscar al cliente.
              </p>
            )}

            {search && result.isFetching && !editing && (
              <p className="text-base text-neutral-700">Buscando cliente…</p>
            )}

            {search && !result.isFetching && notFound && (
              <Alert variant="error">
                <p>
                  No hay ningún cliente con{' '}
                  {DOCUMENT_TYPES[search.documentType].label}{' '}
                  <strong>{search.documentNumber}</strong>.{' '}
                  <Link
                    to={PATHS.caja.altaCliente}
                    className="font-semibold underline underline-offset-2"
                  >
                    Darlo de alta
                  </Link>
                </p>
              </Alert>
            )}

            {search && !result.isFetching && result.isError && !notFound && (
              <Alert variant="error">
                No se pudo buscar el cliente.
                {result.error.messages.length > 0 && (
                  <ul className="mt-1 list-disc pl-5">
                    {result.error.messages.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                )}
              </Alert>
            )}

            {result.data && !result.isFetching && !result.isError && !editing && (
              <ClientSummary
                client={result.data}
                onEdit={() => {
                  setSaved(null)
                  setEditing(true)
                }}
              />
            )}

            {result.data && editing && (
              <EditClientForm
                key={result.data.id}
                client={result.data}
                onSaved={onSaved}
                onCancel={() => setEditing(false)}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
