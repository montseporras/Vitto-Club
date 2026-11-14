// Este archivo es la pantalla de la sección "Puntos" de la configuración.
// Trae cada configuración guardada y le muestra al Administrador el formulario para cambiarla.
import { StatusText } from '@/shared/components/feedback/StatusText';
import { Alert } from '@/shared/components/ui/Alert';
import { Card, CardTitle } from '@/shared/components/ui/Card';
import {
  useFrequentCustomers,
  useFirstConsumptionBonus,
  useLoyaltyLevels,
  usePointsEquivalence,
  usePointsExpiration,
} from '../api/points.queries';
import { FirstConsumptionBonusForm } from '../components/FirstConsumptionBonusForm';
import { FrequentCustomersForm } from '../components/FrequentCustomersForm';
import { LoyaltyLevelsForm } from '../components/LoyaltyLevelsForm';
import { PointsEquivalenceForm } from '../components/PointsEquivalenceForm';
import { PointsExpirationForm } from '../components/PointsExpirationForm';

// El título de la sección lo muestra el encabezado del modal de Configuración.
export function PointsSettingsPage() {
  const equivalence = usePointsEquivalence();
  const expiration = usePointsExpiration();
  const levels = useLoyaltyLevels();
  const frequent = useFrequentCustomers();
  const { data: bonus, isLoading, isError, refetch } = useFirstConsumptionBonus();

  return (
    <div className="space-y-4">
      {/* RF-014. Guardar no recalcula los movimientos ya registrados. */}
      <StatusText>
        Los cambios se aplican a las operaciones futuras. Los movimientos ya
        registrados no se modifican.
      </StatusText>

      {/* RF-09. Cada configuración de puntos tiene su propia Card. */}
      <Card compact>
        <CardTitle>Equivalencia de puntos</CardTitle>
        <StatusText className="mt-0.5 mb-3 text-sm">
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

      <Card compact>
        <CardTitle>Niveles</CardTitle>
        <StatusText className="mt-0.5 mb-3 text-sm">
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

      {/* US-51 (S5-22): mínimo de consumos de un cliente frecuente. */}
      <Card compact>
        <CardTitle>Clientes frecuentes</CardTitle>
        <StatusText className="mt-0.5 mb-3 text-sm">
          Un cliente es frecuente si tiene al menos{' '}
          {frequent.data?.minConsumptions ?? '…'} consumos en el período. Se usa en
          Estadísticas y reportes.
        </StatusText>

        {frequent.isLoading && <StatusText>Cargando mínimo…</StatusText>}

        {frequent.isError && (
          <Alert variant="error">
            <p>
              No se pudo cargar el mínimo.{' '}
              <button
                type="button"
                onClick={() => void frequent.refetch()}
                className="cursor-pointer font-semibold underline underline-offset-2"
              >
                Reintentar
              </button>
            </p>
          </Alert>
        )}

        {frequent.data && !frequent.isError && (
          <FrequentCustomersForm frequentCustomers={frequent.data} />
        )}
      </Card>

      {/* RF-010. */}
      <Card compact>
        <CardTitle>Vigencia de los puntos</CardTitle>
        <StatusText className="mt-0.5 mb-3 text-sm">
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
      <Card compact>
        <CardTitle>Bonificación por primer consumo</CardTitle>
        <StatusText className="mt-0.5 mb-3 text-sm">
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
