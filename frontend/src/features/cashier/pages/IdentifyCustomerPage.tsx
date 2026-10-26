import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useLocation } from 'react-router'
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
import { ConsumptionRegistered } from '../components/ConsumptionRegistered'
import { CustomerActivityPanel } from '../components/CustomerActivityPanel'
import { CustomerPointsCard } from '../components/CustomerPointsCard'
import { Last24hConsumptions } from '../components/Last24hConsumptions'
import { RegisterConsumptionForm } from '../components/RegisterConsumptionForm'
import {
  findCustomerSchema,
  type FindCustomerFormInput,
  type FindCustomerFormOutput,
} from '../schemas/find-customer.schema'
import type { CreateConsumptionResult } from '../types/consumption'

const DOCUMENT_OPTIONS = DOCUMENT_TYPE_VALUES.map((type) => ({
  value: type,
  label: DOCUMENT_TYPES[type].label,
}))

type IdentifyCustomerPageProps = {
  /**
   * A dónde lleva "Registrar cliente" cuando no se encuentra al cliente. En Caja, a "Nuevo
   * cliente"; en Administración, a Clientes (contrato §3.1.1). Por defecto, el de Caja.
   */
  newCustomerPath?: string
}

/**
 * Buscar cliente: se identifica al cliente por documento y se ven su nivel y saldo (US-46).
 * Con el cliente encontrado se registra su consumo (US-21).
 */
export function IdentifyCustomerPage({
  // Relativo a /caja: un feature no importa de app/
  newCustomerPath = '../alta-cliente',
}: IdentifyCustomerPageProps) {
  // "Registrar consumo" de la ficha llega con el documento del cliente: se busca directo
  const prefilled = useLocation().state as DocumentSearch | null
  const {
    register,
    handleSubmit,
    control,
    reset,
    setFocus,
    formState: { errors },
  } = useForm<FindCustomerFormInput, unknown, FindCustomerFormOutput>({
    resolver: zodResolver(findCustomerSchema),
    defaultValues: prefilled ?? { documentType: 'DNI', documentNumber: '' },
  })
  const [search, setSearch] = useState<DocumentSearch | null>(prefilled)
  // Monto que espera confirmación en la advertencia (null: la advertencia está cerrada)
  const [pendingAmount, setPendingAmount] = useState<number | null>(null)
  // Cada consumo registrado vuelve a arrancar el formulario del monto, con el mismo cliente
  const [formVersion, setFormVersion] = useState(0)
  // Tras registrar, el saldo se actualiza sin esconder la tarjeta del cliente
  const [quietRefresh, setQuietRefresh] = useState(false)
  // Resultado del último consumo: mientras exista se muestra "Consumo registrado" (CA-21.9)
  const [registered, setRegistered] = useState<CreateConsumptionResult | null>(null)
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
    setQuietRefresh(false)
    setRegistered(null)
  }

  const isDni = useWatch({ control, name: 'documentType' }) === 'DNI'
  // Tras registrar el consumo el cliente sigue a la vista, con su saldo actualizado
  const finishRegistration = (result: CreateConsumptionResult) => {
    setPendingAmount(null)
    setQuietRefresh(true)
    setFormVersion((version) => version + 1)
    setRegistered(result)
  }

  // Vuelve al formulario del monto, vacío y con el mismo cliente: "Registrar otro consumo"
  // (US-21) y "Sí, registrar consumo" después de anular (contrato §3.2.2)
  const registerAnother = () => {
    setRegistered(null)
    setQuietRefresh(true)
    setFormVersion((version) => version + 1)
  }

  // Vuelve a la búsqueda, vacía y lista para escribir otro documento
  const searchAnother = () => {
    setPendingAmount(null)
    setRegistered(null)
    setSearch(null)
    reset()
    // Después del render: el botón que se apretó desaparece y se llevaría el foco
    setTimeout(() => setFocus('documentNumber'))
  }

  const loading =
    result.isFetching || (customer !== null && points.isFetching && !quietRefresh)
  const showingCustomer = !loading && customer !== null && !!points.data

  return (
    <Page>
      <PageCard title="Buscar cliente" variant="plain">
        {/* Solo con los datos de un cliente a la vista */}
        {showingCustomer && (
          <div className="mb-5">
            <Button type="button" variant="secondary" onClick={searchAnother}>
              <Icon d={ICONS.search} />
              Buscar otro cliente
            </Button>
          </div>
        )}
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
                  <Link
                    to={newCustomerPath}
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
                {registered ? (
                  <ConsumptionRegistered
                    result={registered}
                    // "Ver detalle" es solo del Administrador (CA-21.10)
                    canViewDetail={session.user.role === 'ADMIN'}
                    onRegisterAnother={registerAnother}
                  />
                ) : (
                  <RegisterConsumptionForm
                    // Al cambiar de cliente, el formulario vuelve a arrancar vacío
                    key={`${customer.id}-${formVersion}`}
                    customerId={customer.id}
                    onSubmitAmount={setPendingAmount}
                    onCancel={() => undefined}
                  />
                )}
                <CustomerActivityPanel
                  // Al cambiar de cliente, el panel vuelve a arrancar cerrado
                  key={customer.id}
                  customerId={customer.id}
                  role={session.user.role}
                />
                {/* Segundo panel de la búsqueda (contrato §3.1.4): consumos de 24 hs y anulación */}
                <Last24hConsumptions
                  key={`${customer.id}-consumptions`}
                  customerId={customer.id}
                  onRegisterNew={registerAnother}
                />
                {pendingAmount !== null && (
                  <ConfirmConsumptionModal
                    customerId={customer.id}
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
