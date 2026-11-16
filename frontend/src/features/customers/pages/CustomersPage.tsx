import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { DOCUMENT_TYPES, DOCUMENT_TYPE_VALUES, type DocumentType } from '@/domain/documents'
import { LEVELS, type Level } from '@/domain/levels'
import { CUSTOMER_REGISTERED_MESSAGE } from '@/features/cashier'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Badge } from '@/shared/components/ui/Badge'
import { EmptyState } from '@/shared/components/feedback/EmptyState'
import { ActionsMenu } from '@/shared/components/ui/ActionsMenu'
import { Button } from '@/shared/components/ui/Button'
import { ICONS } from '@/shared/components/ui/icons'
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
import { useUndoableAction } from '@/shared/hooks/useUndoableAction'
import { useClampPage, useRowsThatFit } from '@/shared/hooks/useRowsThatFit'
import { isoToDisplayDateOnly } from '@/shared/lib/dates'
import { formatInteger } from '@/shared/lib/numbers'
import { cn } from '@/shared/lib/utils'
import { buttonVariants, pointsToneStyles } from '@/styles/ui'
import { CUSTOMERS_PAGE_SIZE } from '../api/customers.api'
import { useCustomers, useDeactivateCustomer } from '../api/customers.queries'
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
  const [editingFromMenu, setEditingFromMenu] = useState(false)
  // Clientes eliminados que esperan la ventana para deshacer: no se muestran
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<number>>(new Set())
  const deactivate = useDeactivateCustomer()
  const runUndoable = useUndoableAction()
  const [registering, setRegistering] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Filas por página: las que entran en la pantalla (ajustes S5-57). Debajo de la tabla quedan
  // el botón "+ Registrar cliente" (24 + 52 px) y, si hay, el mensaje de éxito (16 + 18 px).
  const areaRef = useRef<HTMLDivElement>(null)
  const pagerRef = useRef<HTMLElement>(null)
  const limit = useRowsThatFit({
    areaRef,
    pagerRef,
    initial: CUSTOMERS_PAGE_SIZE,
    extraBelow: 76 + (message ? 34 : 0),
  })
  const customers = useCustomers({ documentType, documentNumber, level, page, limit })
  useClampPage(page, setPage, customers.data?.total, customers.data?.limit)

  const closeAll = (done?: string) => {
    setSelected(null)
    setDeleting(false)
    setEditingFromMenu(false)
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
              inputMode={documentType === 'DNI' ? 'numeric' : 'text'}
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
            documentNumber || level ? (
              <EmptyState
                icon={ICONS.search}
                title="No encontramos clientes"
                description="Ningún cliente coincide con ese documento o nivel. Revisá el número o probá con otro filtro."
                action={
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setSearch('')
                      setLevel('')
                      setPage(1)
                    }}
                  >
                    Limpiar búsqueda
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={ICONS.users}
                title="Todavía no hay clientes"
                description="Cuando registres al primero, va a aparecer acá con su nivel y su saldo."
                action={
                  <Button type="button" onClick={() => setRegistering(true)}>
                    + Registrar cliente
                  </Button>
                }
              />
            )
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
                  {customers.data.items.filter((customer) => !hiddenIds.has(customer.id)).map((customer) => (
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
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
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
                            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                          >
                            Ver ficha
                          </Link>
                          <ActionsMenu
                            label={`Acciones de ${customer.firstName} ${customer.lastName}`}
                            items={[
                              {
                                label: 'Editar',
                                icon: ICONS.pencil,
                                onSelect: () => {
                                  setMessage(null)
                                  setEditingFromMenu(true)
                                  setSelected(customer)
                                },
                              },
                              {
                                label: 'Eliminar',
                                danger: true,
                                onSelect: () => {
                                  setMessage(null)
                                  setSelected(customer)
                                  setDeleting(true)
                                },
                              },
                            ]}
                          />
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
          startEditing={editingFromMenu}
          onClose={() => closeAll()}
          onDelete={() => setDeleting(true)}
          onSaved={() => closeAll('Cliente actualizado. El cambio queda en la auditoría.')}
        />
      )}

      {selected && deleting && (
        <DeactivateCustomerDialog
          customer={selected}
          onCancel={() => setDeleting(false)}
          onConfirm={() => {
            const id = selected.id
            closeAll()
            setHiddenIds((current) => new Set(current).add(id))
            const show = () =>
              setHiddenIds((current) => {
                const next = new Set(current)
                next.delete(id)
                return next
              })
            runUndoable({
              message: 'Cliente eliminado',
              undoneMessage: 'Listo, el cliente sigue activo',
              commit: () => deactivate.mutateAsync(id),
              onUndo: show,
              onError: show,
            })
          }}
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
