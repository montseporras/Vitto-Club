import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router'
import { DOCUMENT_TYPES, DOCUMENT_TYPE_VALUES } from '@/domain/documents'
import { useSession } from '@/features/auth'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { FormField } from '@/shared/components/forms/FormField'
import { SegmentedRadio } from '@/shared/components/forms/SegmentedRadio'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { Input } from '@/shared/components/ui/Input'
import { Page, PageCard } from '@/shared/components/ui/Page'
import { dividedSectionStyles, formSectionTitleStyles } from '@/styles/ui'
import {
  useCustomerByDocument,
  useCustomerPoints,
  type DocumentSearch,
} from '../api/cashier.queries'
import { ConfirmConsumptionModal } from '../components/ConfirmConsumptionModal'
import { CustomerActivityPanel } from '../components/CustomerActivityPanel'
import { CustomerPointsCard } from '../components/CustomerPointsCard'
import { RegisterConsumptionForm } from '../components/RegisterConsumptionForm'
import {
  findCustomerSchema,
  type FindCustomerFormInput,
  type FindCustomerFormOutput,
} from '../schemas/find-customer.schema'

const DOCUMENT_OPTIONS = DOCUMENT_TYPE_VALUES.map((type) => ({
  value: type,
  label: DOCUMENT_TYPES[type].label,
}))

/**
 * Buscar cliente: se identifica al cliente por documento y se ven su nivel y saldo (US-46).
 * Con el cliente encontrado se registra su consumo (US-21).
 */
export function IdentifyCustomerPage() {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FindCustomerFormInput, unknown, FindCustomerFormOutput>({
    resolver: zodResolver(findCustomerSchema),
    defaultValues: { documentType: 'DNI', documentNumber: '' },
  })
  const [search, setSearch] = useState<DocumentSearch | null>(null)
  // Monto que espera confirmación en la advertencia (null: la advertencia está cerrada)
  const [pendingAmount, setPendingAmount] = useState<number | null>(null)
  const session = useSession()
  const result = useCustomerByDocument(search)

  // Un cliente dado de baja se trata como no encontrado: no se reactiva, si
  // vuelve se inscribe de nuevo (contrato §3.1.1)
  const inactive = result.data !== undefined && !result.data.active
  const notFound = (result.isError && result.error.status === 404) || inactive
  const customer = result.data && !result.isError && !inactive ? result.data : null
  // El saldo y el nivel salen de GET /customers/:id/puntos (CA-46.2)
  const points = useCustomerPoints(customer?.id ?? null)

  const onSearch = (data: FindCustomerFormOutput) => {
    const sameSearch =
      search?.documentType === data.documentType &&
      search.documentNumber === data.documentNumber
    // Misma búsqueda: se vuelve a pedir para no mostrar datos viejos
    if (sameSearch) {
      result.refetch()
      if (customer) points.refetch()
    } else setSearch(data)
  }

  const isDni = useWatch({ control, name: 'documentType' }) === 'DNI'
  // Tras registrar el consumo se vuelve a la búsqueda, vacía
  const finishRegistration = () => {
    setPendingAmount(null)
    setSearch(null)
    reset()
  }

  const loading = result.isFetching || (customer !== null && points.isFetching)

  return (
    <Page>
      <PageCard title="Buscar cliente" variant="plain">
        <div className={formSectionTitleStyles.root}>
          <h3 className={formSectionTitleStyles.title}>Cliente</h3>
        </div>
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
                placeholder={isDni ? '38.456.123' : 'AAB123456'}
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
                disabled={loading}
                className="shrink-0 px-5"
              >
                <Icon d={ICONS.search} />
                Buscar
              </Button>
            </div>
          </FormField>
        </form>

        {search && (
          <div className={dividedSectionStyles} aria-live="polite">
            {loading && <StatusText>Buscando cliente…</StatusText>}

            {!loading && notFound && (
              <Alert variant="error">
                <p>
                  {/* Texto del contrato §3.1.1 */}
                  No existe un cliente con ese{' '}
                  {search.documentType === 'DNI' ? 'DNI' : 'pasaporte'}.{' '}
                  {/* Relativo a /caja: un feature no importa de app/ (ver docs/FRONTEND-STRUCTURE.md, sección 02). */}
                  <Link
                    to="../alta-cliente"
                    // El alta arranca con el documento que se buscó
                    state={search}
                    className="font-semibold underline underline-offset-2"
                  >
                    Registrar cliente
                  </Link>
                </p>
              </Alert>
            )}

            {!loading && result.isError && !notFound && (
              <Alert variant="error">
                No se pudo buscar el cliente.
                <AlertMessages messages={result.error.messages} />
              </Alert>
            )}

            {!loading && customer && points.isError && (
              <Alert variant="error">
                No se pudo buscar el cliente.
                <AlertMessages messages={points.error.messages} />
              </Alert>
            )}

            {!loading && customer && points.data && session.user && (
              <div className="flex flex-col gap-4">
                <CustomerPointsCard customer={customer} points={points.data} />
                <RegisterConsumptionForm
                  // Al cambiar de cliente, el formulario vuelve a arrancar vacío
                  key={customer.id}
                  customerId={customer.id}
                  onSubmitAmount={setPendingAmount}
                  onCancel={() => undefined}
                />
                <CustomerActivityPanel
                  // Al cambiar de cliente, el panel vuelve a arrancar cerrado
                  key={customer.id}
                  customerId={customer.id}
                  role={session.user.role}
                />
                {pendingAmount !== null && (
                  <ConfirmConsumptionModal
                    customerId={customer.id}
                    customerName={`${customer.firstName} ${customer.lastName}`}
                    amount={pendingAmount}
                    onCancel={() => setPendingAmount(null)}
                    onRegistered={finishRegistration}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </PageCard>
    </Page>
  )
}
