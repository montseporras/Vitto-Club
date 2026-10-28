import { useState } from 'react'
import { Link } from 'react-router'
import { DOCUMENT_TYPES, DOCUMENT_TYPE_VALUES, type DocumentType } from '@/domain/documents'
import { LEVELS, type Level } from '@/domain/levels'
import { CUSTOMER_REGISTERED_MESSAGE } from '@/features/cashier'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { FormField } from '@/shared/components/forms/FormField'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { Input } from '@/shared/components/ui/Input'
import { Page, PageCard } from '@/shared/components/ui/Page'
import { Pagination } from '@/shared/components/ui/Pagination'
import { Select } from '@/shared/components/ui/Select'
import {
  Table,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/shared/components/ui/Table'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { isoToDisplayDateOnly } from '@/shared/lib/dates'
import { formatInteger } from '@/shared/lib/numbers'
import { cn } from '@/shared/lib/utils'
import { buttonVariants, pointsToneStyles } from '@/styles/ui'
import { CUSTOMERS_PAGE_SIZE } from '../api/customers.api'
import { useCustomers } from '../api/customers.queries'
import { CustomerDetailsModal } from '../components/CustomerDetailsModal'
import { DeactivateCustomerDialog } from '../components/DeactivateCustomerDialog'
import { RegisterCustomerModal } from '../components/RegisterCustomerModal'
import type { CustomerListItem } from '../types/customers'

const DOCUMENT_TYPE_OPTIONS = DOCUMENT_TYPE_VALUES.map((value) => ({
  value,
  label: DOCUMENT_TYPES[value].label,
}))

// Placeholder del número según el tipo (Sprint 4, §3.13.4)
const DOCUMENT_PLACEHOLDERS: Record<DocumentType, string> = {
  DNI: '38.456.123',
  PASSPORT: 'AAB123456',
}

const LEVEL_OPTIONS = [
  { value: '', label: 'Todos los niveles' },
  ...(Object.keys(LEVELS) as Level[]).map((level) => ({ value: level, label: LEVELS[level] })),
]

/** Clientes del Administrador (CLI-ADM, contrato §3.8): listado, Ver más, editar, eliminar y alta. */
export function CustomersPage() {
  const [documentType, setDocumentType] = useState<DocumentType>('DNI')
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState<Level | ''>('')
  const [page, setPage] = useState(1)
  // Se busca cuando se deja de escribir, para no pedir el listado en cada tecla
  const documentNumber = useDebounce(search.trim(), 300)
  const customers = useCustomers({ documentType, documentNumber, level, page })

  const [selected, setSelected] = useState<CustomerListItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const closeAll = (done?: string) => {
    setSelected(null)
    setDeleting(false)
    setRegistering(false)
    setMessage(done ?? null)
  }

  const totalPages = customers.data
    ? Math.ceil(customers.data.total / CUSTOMERS_PAGE_SIZE)
    : 0

  return (
    <Page className="max-w-6xl">
      <PageCard title="Clientes" variant="plain">
        <div className="grid gap-4 sm:grid-cols-[11rem_1fr_16rem]">
          <FormField id="customers-document-type" label="Tipo de documento" hideRequiredMark>
            <Select
              id="customers-document-type"
              options={DOCUMENT_TYPE_OPTIONS}
              value={documentType}
              onChange={(event) => {
                setDocumentType(event.target.value as DocumentType)
                setPage(1)
              }}
            />
          </FormField>
          <FormField id="customers-search" label="Número de documento" hideRequiredMark>
            <Input
              id="customers-search"
              type="search"
              placeholder={DOCUMENT_PLACEHOLDERS[documentType]}
              autoComplete="off"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
          </FormField>
          <FormField id="customers-level" label="Nivel" hideRequiredMark>
            <Select
              id="customers-level"
              options={LEVEL_OPTIONS}
              value={level}
              onChange={(event) => {
                setLevel(event.target.value as Level | '')
                setPage(1)
              }}
            />
          </FormField>
        </div>

        <div className="mt-6" aria-live="polite">
          {customers.isPending && <StatusText>Cargando…</StatusText>}

          {customers.isError && (
            <Alert variant="error">
              No se pudo cargar el listado de clientes.
              <AlertMessages messages={customers.error.messages} />
            </Alert>
          )}

          {customers.data && customers.data.items.length === 0 && (
            <StatusText>Sin resultados para esa búsqueda.</StatusText>
          )}

          {customers.data && customers.data.items.length > 0 && (
            <>
              <Table>
                <TableHead>
                  <tr>
                    <TableHeaderCell>Apellido</TableHeaderCell>
                    <TableHeaderCell>Nombre</TableHeaderCell>
                    <TableHeaderCell>Nivel</TableHeaderCell>
                    <TableHeaderCell>Saldo</TableHeaderCell>
                    <TableHeaderCell>Fecha de alta</TableHeaderCell>
                    <TableHeaderCell>Estado</TableHeaderCell>
                    <TableHeaderCell>
                      <span className="sr-only">Acciones</span>
                    </TableHeaderCell>
                  </tr>
                </TableHead>
                <tbody>
                  {customers.data.items.map((customer) => (
                    <TableRow key={customer.id} highlight>
                      <TableCell>{customer.lastName}</TableCell>
                      <TableCell>{customer.firstName}</TableCell>
                      <TableCell>
                        <Badge variant="accent">{LEVELS[customer.level]}</Badge>
                      </TableCell>
                      <TableCell
                        className={cn(
                          'tabular-nums',
                          customer.balance < 0 && pointsToneStyles.negative,
                        )}
                      >
                        {formatInteger(customer.balance)} pts
                      </TableCell>
                      <TableCell>{isoToDisplayDateOnly(customer.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="success">Activo</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setMessage(null)
                              setSelected(customer)
                            }}
                          >
                            Ver más
                          </Button>
                          <Link
                            to={String(customer.id)}
                            className={buttonVariants({ variant: 'ghost' })}
                          >
                            Ver ficha
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </Table>

              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={setPage}
                disabled={customers.isFetching}
              />
            </>
          )}
        </div>

        {message && (
          <Alert variant="success" className="mt-5">
            {message}
          </Alert>
        )}

        <div className="mt-6">
          <Button
            type="button"
            size="lg"
            onClick={() => {
              setMessage(null)
              setRegistering(true)
            }}
          >
            <Icon d={ICONS.plus} />
            Registrar cliente
          </Button>
        </div>
      </PageCard>

      {selected && !deleting && (
        <CustomerDetailsModal
          customer={selected}
          onClose={() => closeAll()}
          onDelete={() => setDeleting(true)}
          onSaved={() => closeAll('Cliente actualizado y registrado en auditoría.')}
        />
      )}

      {selected && deleting && (
        <DeactivateCustomerDialog
          customer={selected}
          onCancel={() => setDeleting(false)}
          onDeleted={() => closeAll('Cliente eliminado.')}
        />
      )}

      {registering && (
        <RegisterCustomerModal
          onClose={() => closeAll()}
          onCreated={() => closeAll(CUSTOMER_REGISTERED_MESSAGE)}
        />
      )}
    </Page>
  )
}
