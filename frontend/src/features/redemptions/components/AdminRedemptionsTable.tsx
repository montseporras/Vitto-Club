// Tabla de la pantalla Canjes del Administrador (US-45, CA-45.8, contrato §3.12.3). Las filas no
// tienen botones (S4-19): un clic abre el detalle.
import { DOCUMENT_TYPES } from '@/domain/documents'
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
import { formatInteger } from '@/shared/lib/numbers'
import { cn } from '@/shared/lib/utils'
import { expiresInText, isExpiringSoon } from '../lib/format'
import { resolverName } from '../lib/resolver'
import type { Redemption } from '../types/redemption'
import { RedemptionStatusBadge } from './RedemptionStatusBadge'

type AdminRedemptionsTableProps = {
  items: Redemption[]
  now: number
  onOpen: (redemption: Redemption) => void
}

export function AdminRedemptionsTable({ items, now, onOpen }: AdminRedemptionsTableProps) {
  return (
    <Table className="mt-6">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Código</TableHeaderCell>
          <TableHeaderCell>Fecha y hora</TableHeaderCell>
          <TableHeaderCell>Cliente</TableHeaderCell>
          <TableHeaderCell>Recompensa</TableHeaderCell>
          <TableHeaderCell className="text-right">Puntos</TableHeaderCell>
          <TableHeaderCell>Estado</TableHeaderCell>
          <TableHeaderCell>Vence / resuelto</TableHeaderCell>
          <TableHeaderCell>
            <span className="sr-only">Ver canje</span>
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <tbody>
        {items.map((redemption) => {
          const confirmed = redemption.status === 'CONFIRMED'
          return (
            <TableRow
              key={redemption.id}
              interactive
              tabIndex={0}
              title="Ver canje"
              onClick={() => onOpen(redemption)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onOpen(redemption)
              }}
              className="cursor-pointer"
            >
              <TableCell className="font-bold tracking-wide">{redemption.code}</TableCell>
              <TableCell className="whitespace-nowrap">
                {isoToDisplayDateTime(redemption.createdAt)}
              </TableCell>
              <TableCell>
                <span className="block">
                  {redemption.customer.firstName} {redemption.customer.lastName}
                </span>
                <span className="text-sm text-muted-foreground">
                  {DOCUMENT_TYPES[redemption.customer.documentType].label}{' '}
                  {redemption.customer.documentNumber}
                </span>
              </TableCell>
              <TableCell>{redemption.reward.name}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatInteger(redemption.reward.points)}
              </TableCell>
              <TableCell>
                <RedemptionStatusBadge status={redemption.status} />
              </TableCell>
              <TableCell>
                {confirmed ? (
                  <span
                    className={cn(isExpiringSoon(redemption.expiresAt, now) && 'text-red-700')}
                  >
                    {expiresInText(redemption.expiresAt, now)}
                  </span>
                ) : (
                  <>
                    {redemption.resolvedAt && isoToDisplayDateTime(redemption.resolvedAt)}
                    <span className="block text-sm text-muted-foreground">
                      {resolverName(redemption)}
                    </span>
                  </>
                )}
              </TableCell>
              <TableCell className="text-accent-700">
                <Icon d={ICONS.chevronRight} className="size-4" aria-hidden="true" />
              </TableCell>
            </TableRow>
          )
        })}
      </tbody>
    </Table>
  )
}
