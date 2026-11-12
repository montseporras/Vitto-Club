import { DOCUMENT_TYPES } from '@/domain/documents'
import { LEVELS } from '@/domain/levels'
import { Badge } from '@/shared/components/ui/Badge'
import { Card, CardTitle } from '@/shared/components/ui/Card'
import { cn } from '@/shared/lib/utils'
import { dataListTermStyles, pointsToneStyles } from '@/styles/ui'
import { formatInteger } from '@/shared/lib/numbers'
import type { Customer } from '../types/customer'
import type { CustomerPoints } from '../types/points'

type CustomerPointsCardProps = {
  // En caja solo se muestran nombre y documento, nunca los datos de contacto
  // (docs/architecture/estructura-frontend.md, §09 c)
  customer: Pick<Customer, 'firstName' | 'lastName' | 'documentType' | 'documentNumber'>
  points: CustomerPoints
}

/** Tarjeta del cliente encontrado: nombre, nivel, documento y saldo (US-46, CA-46.2). */
export function CustomerPointsCard({ customer, points }: CustomerPointsCardProps) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6 sm:py-5">
      <div className="flex flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-lg">
            {customer.firstName} {customer.lastName}
          </CardTitle>
          <Badge variant="accent">Nivel {LEVELS[points.level.current]}</Badge>
        </div>
        <p className="text-sm text-neutral-700">
          {DOCUMENT_TYPES[customer.documentType].label} {customer.documentNumber}
        </p>
      </div>

      <div className="text-right">
        <p className={dataListTermStyles}>Saldo actual</p>
        {/* Saldo negativo: en rojo y con el signo "−" (no solo el color) */}
        <p
          className={cn(
            'font-number text-[22px] font-normal lining-nums tabular-nums',
            points.negativeBalance ? pointsToneStyles.negative : 'text-accent-800',
          )}
        >
          {formatInteger(points.balance)} pts
        </p>
      </div>
    </Card>
  )
}
