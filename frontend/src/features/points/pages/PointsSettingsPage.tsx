// Este archivo es la pantalla de la sección "Puntos" de la configuración.
// Trae cada configuración guardada y le muestra al Administrador el formulario para cambiarla.
import { StatusText } from '@/shared/components/feedback/StatusText';
import { Alert } from '@/shared/components/ui/Alert';
import { Card, CardTitle } from '@/shared/components/ui/Card';
import {
  useFirstPurchaseBonus,
  usePointsEquivalence,
  usePointsExpiration,
} from '../api/points.queries';
import { FirstPurchaseBonusForm } from '../components/FirstPurchaseBonusForm';
import { PointsEquivalenceForm } from '../components/PointsEquivalenceForm';
import { PointsExpirationForm } from '../components/PointsExpirationForm';

// El título de la sección lo muestra el encabezado del modal de Configuración.
export function PointsSettingsPage() {
  const equivalence = usePointsEquivalence();
  const expiration = usePointsExpiration();
  const { data: bonus, isLoading, isError, refetch } = useFirstPurchaseBonus();

  return (
    <div className="space-y-6">
      {/* RF-09. Cada configuración de puntos tiene su propia Card. */}
      <Card>
        <CardTitle>Equivalencia de puntos</CardTitle>
        <StatusText className="mt-1 mb-6">
          Cantidad de puntos que suma el cliente según el monto de cada compra.
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

        {equivalence.data && !equivalence.isError && (
          <PointsEquivalenceForm equivalence={equivalence.data} />
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
        <CardTitle>Bonificación por primera compra</CardTitle>
        <StatusText className="mt-1 mb-6">
          Puntos adicionales que recibe el cliente en su primera compra
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

        {bonus && !isError && <FirstPurchaseBonusForm bonus={bonus} />}
      </Card>
    </div>
  );
}
