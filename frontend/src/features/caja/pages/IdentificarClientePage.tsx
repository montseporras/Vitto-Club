import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router'
import { DOCUMENT_TYPES, DOCUMENT_TYPE_VALUES } from '@/domain/documents'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { FormField } from '@/shared/components/forms/FormField'
import { SegmentedRadio } from '@/shared/components/forms/SegmentedRadio'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { Input } from '@/shared/components/ui/Input'
import { Page, PageCard } from '@/shared/components/ui/Page'
import { dividedSectionStyles } from '@/styles/ui'
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
  const [reactivated, setReactivated] = useState<Client | null>(null)
  const result = useClientByDocument(search)

  const onSearch = (data: BuscarClienteFormOutput) => {
    setEditing(false)
    setSaved(null)
    setReactivated(null)
    const sameSearch =
      search?.documentType === data.documentType &&
      search.documentNumber === data.documentNumber
    // Misma búsqueda: se vuelve a pedir para no mostrar datos viejos
    if (sameSearch) result.refetch()
    else setSearch(data)
  }

  const onSaved = (client: Client) => {
    setSaved(client)
    setReactivated(null)
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
    <Page>
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

      {reactivated && (
        <Alert variant="success" className="mb-5">
          <p>
            Cuenta reactivada:{' '}
            <strong>
              {reactivated.firstName} {reactivated.lastName}
            </strong>{' '}
            ya puede operar normalmente.
          </p>
        </Alert>
      )}

      <PageCard eyebrow="Clientes" title="Buscar">
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
                <Icon d={ICONS.search} />
                Buscar
              </Button>
            </div>
          </FormField>
        </form>

        <div className={dividedSectionStyles} aria-live="polite">
          {!search && (
            <StatusText>
              Ingresá el tipo y número de documento para buscar al cliente.
            </StatusText>
          )}

          {search && result.isFetching && !editing && (
            <StatusText>Buscando cliente…</StatusText>
          )}

          {search && !result.isFetching && notFound && (
            <Alert variant="error">
              <p>
                No hay ningún cliente con{' '}
                {DOCUMENT_TYPES[search.documentType].label}{' '}
                <strong>{search.documentNumber}</strong>.{' '}
                {/* Relativo a /caja: un feature no importa de app/ (ver docs/FRONTEND-STRUCTURE.md, sección 02). */}
                <Link
                  to="../alta-cliente"
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
              <AlertMessages messages={result.error.messages} />
            </Alert>
          )}

          {result.data && !result.isFetching && !result.isError && !editing && (
            <ClientSummary
              client={result.data}
              onEdit={() => {
                setSaved(null)
                setReactivated(null)
                setEditing(true)
              }}
              onActivated={(client) => {
                setSaved(null)
                setReactivated(client)
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
      </PageCard>
    </Page>
  )
}
