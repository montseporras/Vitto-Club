// Este archivo es la pantalla de la sección "Puntos" de la configuración.
// Trae cada configuración guardada y le muestra al Administrador el formulario para cambiarla.
import { StatusText } from '@/shared/components/feedback/StatusText';
import { Alert } from '@/shared/components/ui/Alert';
import { Card, CardTitle } from '@/shared/components/ui/Card';
import {
  useFirstConsumptionBonus,
  useLoyaltyLevels,
  usePointsEquivalence,
  usePointsExpiration,
} from '../api/points.queries';
import { FirstConsumptionBonusForm } from '../components/FirstConsumptionBonusForm';
import { LoyaltyLevelsForm } from '../components/LoyaltyLevelsForm';
import { PointsEquivalenceForm } from '../components/PointsEquivalenceForm';
import { PointsExpirationForm } from '../components/PointsExpirationForm';

// El título de la sección lo muestra el encabezado del modal de Configuración.
export function PointsSettingsPage() {
  const equivalence = usePointsEquivalence();
  const expiration = usePointsExpiration();
  const levels = useLoyaltyLevels();
  const { data: bonus, isLoading, isError, refetch } = useFirstConsumptionBonus();

  return (
    <div className="space-y-6">
      {/* RF-014. Guardar no recalcula los movimientos ya registrados. */}
      <StatusText>
        Los cambios se aplican a las operaciones futuras. Los movimientos ya
        registrados no se modifican.
      </StatusText>

      {/* RF-09. Cada configuración de puntos tiene su propia Card. */}
      <Card>
        <CardTitle>Equivalencia de puntos</CardTitle>
        <StatusText className="mt-1 mb-6">
          Cantidad de puntos que suma el cliente según el monto de cada consumo.
        </StatusText>

        {equivalence.isLoading && (
          <StatusText>Cargando equivalencia…</StatusText>
        )}

        {equivalence.isError && (
          <Alert variant="error">
            <p>
              No se pudo cargar la equivalencia.{' '}
              <button
                type="button"
                onClick={() => void equivalence.refetch()}
                className="cursor-pointer font-semibold underline underline-offset-2"
              >
                Reintentar
              </button>
            </p>
          </Alert>
        )}

        {/* data es null si todavía no se configuró: el formulario arranca vacío. */}
        {equivalence.data !== undefined && !equivalence.isError && (
          <PointsEquivalenceForm equivalence={equivalence.data} />
        )}
      </Card>

      <Card>
        <CardTitle>Niveles</CardTitle>
        <StatusText className="mt-1 mb-6">
          El nivel del cliente se calcula según los puntos que acumuló por
          consumos a lo largo del tiempo.
        </StatusText>

        {levels.isLoading && <StatusText>Cargando niveles…</StatusText>}

        {levels.isError && (
          <Alert variant="error">
            <p>
              No se pudieron cargar los niveles.{' '}
              <button
                type="button"
                onClick={() => void levels.refetch()}
                className="cursor-pointer font-semibold underline underline-offset-2"
              >
                Reintentar
              </button>
            </p>
          </Alert>
        )}

        {levels.data && !levels.isError && (
          <LoyaltyLevelsForm configuration={levels.data} />
        )}
      </Card>

      {/* RF-010. */}
      <Card>
        <CardTitle>Vigencia de los puntos</CardTitle>
        <StatusText className="mt-1 mb-6">
          Meses que los puntos permanecen disponibles desde que se acreditan.
        </StatusText>

        {expiration.isLoading && <StatusText>Cargando vigencia…</StatusText>}

        {expiration.isError && (
          <Alert variant="error">
            <p>
              No se pudo cargar la vigencia.{' '}
              <button
                type="button"
                onClick={() => void expiration.refetch()}
                className="cursor-pointer font-semibold underline underline-offset-2"
              >
                Reintentar
              </button>
            </p>
          </Alert>
        )}

        {expiration.data && !expiration.isError && (
          <PointsExpirationForm expiration={expiration.data} />
        )}
      </Card>

      {/* RF-011. */}
      <Card>
        <CardTitle>Bonificación por primer consumo</CardTitle>
        <StatusText className="mt-1 mb-6">
          Puntos adicionales que recibe el cliente en su primer consumo
          registrada, además de los que le corresponden normalmente.
        </StatusText>

        {isLoading && <StatusText>Cargando bonificación…</StatusText>}

        {isError && (
          <Alert variant="error">
            <p>
              No se pudo cargar la bonificación.{' '}
              <button
                type="button"
                onClick={() => void refetch()}
                className="cursor-pointer font-semibold underline underline-offset-2"
              >
                Reintentar
              </button>
            </p>
          </Alert>
        )}

        {/* bonus es null si todavía no se configuró: el formulario arranca sin valor. */}
        {bonus !== undefined && !isError && (
          <FirstConsumptionBonusForm bonus={bonus} />
        )}
      </Card>
    </div>
  );
}
