import { useState } from 'react'
import { useSession } from '@/features/auth'
import { CONSUMPTION_STATUSES } from '@/domain/statuses'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import {
  Table,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/shared/components/ui/Table'
import { isoToDisplayDateTime } from '@/shared/lib/dates'
import { formatInteger, formatMoney } from '@/shared/lib/numbers'
import { useCustomerConsumptions } from '../api/consumptions.queries'
import type { Consumption } from '../types/consumption'
import { VoidConsumptionModal } from './VoidConsumptionModal'

type Last24hConsumptionsProps = {
  customerId: number
  /** "Sí, registrar consumo" tras anular. */
  onRegisterNew?: () => void
}

/** Panel desplegable "Ver movimientos de las últimas 24 hs", con el botón para anular. */
export function Last24hConsumptions({
  customerId,
  onRegisterNew,
}: Last24hConsumptionsProps) {
  const { user } = useSession()
  const [open, setOpen] = useState(false)
  const [voiding, setVoiding] = useState<Consumption | null>(null)
  const consumptions = useCustomerConsumptions(customerId)

  // Textos del contrato §3.2.1, según el rol
  const note =
    user?.role === 'ADMIN'
      ? 'Consumos registrados en las últimas 24 hs. Como administrador podés anular cualquiera.'
      : 'Consumos registrados en las últimas 24 hs. Solo podés anular los que registraste vos.'

  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon d={open ? ICONS.chevronDown : ICONS.chevronRight} />
        {open
          ? 'Ocultar movimientos de las últimas 24 hs'
          : 'Ver movimientos de las últimas 24 hs'}
      </Button>

      {open && (
        <div className="mt-3 rounded-2xl border border-accent-200 p-4">
          <p className="mb-3 text-xs text-neutral-600">{note}</p>

          {consumptions.isPending && <StatusText>Cargando…</StatusText>}

          {consumptions.isError && (
            <Alert variant="error">
              No se pudieron cargar los consumos.
              <AlertMessages messages={consumptions.error.messages} />
            </Alert>
          )}

          {consumptions.data?.items.length === 0 && (
            <StatusText>
              No hay consumos de este cliente en las últimas 24 hs.
            </StatusText>
          )}

          {consumptions.data && consumptions.data.items.length > 0 && (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Código</TableHeaderCell>
                  <TableHeaderCell>Fecha y hora</TableHeaderCell>
                  <TableHeaderCell className="text-right">Monto</TableHeaderCell>
                  <TableHeaderCell className="text-right">Puntos</TableHeaderCell>
                  <TableHeaderCell>Registrado por</TableHeaderCell>
                  <TableHeaderCell>Estado</TableHeaderCell>
                  <TableHeaderCell>
                    <span className="sr-only">Acciones</span>
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <tbody>
                {consumptions.data.items.map((consumption) => (
                  <TableRow key={consumption.id}>
                    <TableCell className="font-bold whitespace-nowrap">
                      {consumption.code}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {isoToDisplayDateTime(consumption.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoney(consumption.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatInteger(consumption.totalPoints)}
                    </TableCell>
                    <TableCell>{consumption.registeredBy.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          consumption.status === 'REGISTERED'
                            ? 'success'
                            : 'danger'
                        }
                      >
                        {CONSUMPTION_STATUSES[consumption.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {/* A pedido de Denise: si no puede anular, no se muestra el botón (el contrato lo pedía deshabilitado, con tooltip) */}
                      {consumption.status === 'REGISTERED' &&
                        consumption.canVoid && (
                          <Button
                            type="button"
                            onClick={() => setVoiding(consumption)}
                            className="bg-red-200 text-red-800 shadow-none hover:bg-red-300 active:bg-red-400"
                            aria-label={`Anular consumo ${consumption.code}`}
                          >
                            Anular
                          </Button>
                        )}
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      )}

      {voiding && (
        <VoidConsumptionModal
          consumption={voiding}
          onClose={() => setVoiding(null)}
          onRegisterNew={onRegisterNew}
        />
      )}
    </div>
  )
}
