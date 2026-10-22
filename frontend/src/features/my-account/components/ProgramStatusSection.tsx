import { LEVELS } from '@/domain/levels'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert } from '@/shared/components/ui/Alert'
import { DataList } from '@/shared/components/ui/DataList'
import { cn } from '@/shared/lib/utils'
import { useMyPoints } from '../api/my-account.queries'
import { ProfileSection } from './ProfileSection'

const formatPoints = (value: number) => Math.abs(value).toLocaleString('es-AR')

/**
 * "Mi situación en el programa" (§3.10.3): saldo, nivel y acumulados de
 * /customers/me/puntos. El cálculo es del backend; acá solo se muestra.
 */
export function ProgramStatusSection() {
  const points = useMyPoints()

  return (
    <ProfileSection title="Mi situación en el programa">
      {points.isPending ? (
        <StatusText>Cargando…</StatusText>
      ) : points.isError ? (
        <Alert variant="error">{points.error.message}</Alert>
      ) : (
        <>
          {points.data.negativeBalance && (
            <Alert variant="error" className="mb-4">
              Tu saldo tiene un ajuste pendiente. Comunicate con el restaurante para
              regularizarlo.
            </Alert>
          )}
          <DataList
            items={[
              {
                label: 'Saldo',
                // Negativo: en rojo y con el signo, para no depender solo del color
                value: (
                  <span
                    className={cn(
                      'font-bold',
                      points.data.balance < 0 ? 'text-red-700' : 'text-accent-700',
                    )}
                  >
                    {points.data.balance < 0 && '−'}
                    {formatPoints(points.data.balance)}
                  </span>
                ),
              },
              { label: 'Nivel', value: LEVELS[points.data.level.current] },
              { label: 'Acumulados', value: formatPoints(points.data.lifetimePoints) },
            ]}
          />
        </>
      )}
    </ProfileSection>
  )
}
