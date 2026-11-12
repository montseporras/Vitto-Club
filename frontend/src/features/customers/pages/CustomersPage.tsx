import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { DOCUMENT_TYPES, DOCUMENT_TYPE_VALUES, type DocumentType } from '@/domain/documents'
import { LEVELS, type Level } from '@/domain/levels'
import { CUSTOMER_REGISTERED_MESSAGE } from '@/features/cashier'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { LooseField } from '@/shared/components/ui/FilterBar'
import { FilterSelect } from '@/shared/components/ui/FilterSelect'
import { looseInputClass } from '@/shared/components/ui/filter-styles'
import { AdminPanel } from '@/shared/components/ui/AdminPanel'
import { Page } from '@/shared/components/ui/Page'
import { RangePagination } from '@/shared/components/ui/Pagination'
import {
  Table,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/shared/components/ui/Table'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useClampPage, useRowsThatFit } from '@/shared/hooks/useRowsThatFit'
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
  const [selected, setSelected] = useState<CustomerListItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Filas por página: las que entran en la pantalla (ajustes S5-57). Debajo de la tabla quedan
  // el botón "+ Registrar cliente" (24 + 42 px) y, si hay, el mensaje de éxito (16 + 18 px).
  const areaRef = useRef<HTMLDivElement>(null)
  const pagerRef = useRef<HTMLElement>(null)
  const limit = useRowsThatFit({
    areaRef,
    pagerRef,
    initial: CUSTOMERS_PAGE_SIZE,
    extraBelow: 66 + (message ? 34 : 0),
  })
  const customers = useCustomers({ documentType, documentNumber, level, page, limit })
  useClampPage(page, setPage, customers.data?.total, customers.data?.limit)

  const closeAll = (done?: string) => {
    setSelected(null)
    setDeleting(false)
    setRegistering(false)
    setMessage(done ?? null)
  }

  return (
    <Page className="max-w-none">
      <AdminPanel title="Clientes">
        {/* Campos sueltos con anchos máximos, como en el prototipo (Clientes) */}
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <LooseField
            label="Tipo de documento"
            htmlFor="customers-document-type"
            className="mb-2.5 max-w-[180px]"
          >
            <FilterSelect
              id="customers-document-type"
              variant="field"
              value={documentType}
              options={DOCUMENT_TYPE_OPTIONS}
              onChange={(value) => {
  setDocumentType(value as DocumentType)
  setPage(1)
}}
            />
          </LooseField>
          <LooseField
            label="Número de documento"
            htmlFor="customers-search"
            className="mb-2.5 max-w-[240px]"
          >
            <input
              id="customers-search"
              type="search"
              className={looseInputClass}
              placeholder={DOCUMENT_PLACEHOLDERS[documentType]}
              autoComplete="off"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
          </LooseField>
          <LooseField label="Nivel" htmlFor="customers-level" className="mb-2.5 max-w-[200px]">
            <FilterSelect
              id="customers-level"
              variant="field"
              value={level}
              options={LEVEL_OPTIONS}
              onChange={(value) => {
  setLevel(value as Level | '')
  setPage(1)
}}
            />
          </LooseField>
        </div>

        <div ref={areaRef} aria-live="polite">
          {customers.isPending && <StatusText>Cargando…</StatusText>}

          {customers.isError && (
            <Alert variant="error">
              No se pudo cargar el listado de clientes.
              <AlertMessages messages={customers.error.messages} />
            </Alert>
          )}

          {customers.data && customers.data.items.length === 0 && (
            <p className="text-[13px] text-[#8a6f5e]">Sin resultados para esa búsqueda.</p>
          )}

          {customers.data && customers.data.items.length > 0 && (
            <>
              <Table variant="admin">
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

            </>
          )}
        </div>

        {message && (
          <p role="status" className="mt-4 text-[13px] text-[#7a3a1d]">
            {message}
          </p>
        )}

        <div className="mt-6">
          <Button
            type="button"
            className="h-[42px] px-5 text-[15px]"
            onClick={() => {
              setMessage(null)
              setRegistering(true)
            }}
          >
            + Registrar cliente
          </Button>
        </div>
        {customers.data && customers.data.items.length > 0 && (
          <RangePagination
            ref={pagerRef}
            page={customers.data.page}
            total={customers.data.total}
            pageSize={customers.data.limit}
            onChange={setPage}
            disabled={customers.isFetching}
          />
        )}
      </AdminPanel>

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
