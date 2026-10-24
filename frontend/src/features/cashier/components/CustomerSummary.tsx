import { DOCUMENT_TYPES } from '@/domain/documents'
import { useSession } from '@/features/auth'
import {
  useCustomerPointsMovements,
  type PointsMovementType,
} from '@/features/points-movements'
import { Alert } from '@/shared/components/ui/Alert'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardTitle } from '@/shared/components/ui/Card'
import { DataList } from '@/shared/components/ui/DataList'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { StatusText } from '@/shared/components/feedback/StatusText'
import {
  Table,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/shared/components/ui/Table'
import { isoToArgentinaDateTime } from '@/shared/lib/dates'
import { isoToDisplayDate } from '@/shared/lib/dates'
import type { Customer } from '../types/customer'

const MOVEMENT_TYPE_LABELS: Record<PointsMovementType, string> = {
  CONSUMPTION_CREDIT: 'Acreditación por consumo',
  VOID_REVERSAL: 'Reversión por anulación',
  MANUAL_ADJUSTMENT: 'Ajuste manual',
  EXPIRATION: 'Vencimiento',
  REDEMPTION: 'Canje',
}

const signedPoints = (points: number) =>
  points > 0 ? `+${points}` : points < 0 ? `−${Math.abs(points)}` : '0'

type CustomerSummaryProps = {
  customer: Customer
  onEdit: () => void
}

/** Datos del cliente encontrado (siempre activo) con el botón para editarlos. */
export function CustomerSummary({ customer, onEdit }: CustomerSummaryProps) {
  const session = useSession()
  const movements = useCustomerPointsMovements(customer.id)
  const isCashier = session.user?.role === 'CASHIER'
  const rows = [
    {
      label: 'Documento',
      value: `${DOCUMENT_TYPES[customer.documentType].label} ${customer.documentNumber}`,
    },
    { label: 'Correo electrónico', value: customer.email },
    { label: 'Teléfono', value: customer.phone ?? '—' },
    {
      label: 'Fecha de nacimiento',
      value: customer.dateOfBirth ? isoToDisplayDate(customer.dateOfBirth) : '—',
    },
  ]

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <CardTitle>
            {customer.firstName} {customer.lastName}
          </CardTitle>
          <Badge variant="success">Activo</Badge>
        </div>

        <Button
          type="button"
          size="lg"
          onClick={onEdit}
          className="w-full sm:w-auto"
        >
          <Icon d={ICONS.pencil} />
          Editar datos
        </Button>
      </div>

      <DataList items={rows} className="mt-5" />

      <section aria-labelledby="customer-points-movements" className="mt-6">
        <h3
          id="customer-points-movements"
          className="mb-3 text-lg font-semibold"
        >
          {isCashier
            ? 'Movimientos de las últimas 24 hs'
            : 'Movimientos de puntos'}
        </h3>

        {movements.isLoading && (
          <StatusText>Cargando movimientos…</StatusText>
        )}

        {movements.isError && (
          <Alert>
            <p>{movements.error.message}</p>
          </Alert>
        )}

        {movements.data && !movements.isError && (
          movements.data.items.length > 0 ? (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Fecha y hora</TableHeaderCell>
                  <TableHeaderCell>Tipo</TableHeaderCell>
                  <TableHeaderCell>Detalle</TableHeaderCell>
                  <TableHeaderCell className="text-right">Puntos</TableHeaderCell>
                </TableRow>
              </TableHead>
              <tbody>
                {movements.data.items.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="whitespace-nowrap">
                      {isoToArgentinaDateTime(movement.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge>{MOVEMENT_TYPE_LABELS[movement.type]}</Badge>
                    </TableCell>
                    <TableCell>{movement.description}</TableCell>
                    <TableCell
                      className={`text-right font-semibold ${
                        movement.points > 0
                          ? 'text-green-700'
                          : movement.points < 0
                            ? 'text-red-700'
                            : ''
                      }`}
                    >
                      {signedPoints(movement.points)}
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          ) : (
            <StatusText className="rounded-xl border border-dashed p-6 text-center">
              Este cliente todavía no tiene movimientos de puntos.
            </StatusText>
          )
        )}
      </section>
    </Card>
  )
}
