// Este archivo es la pantalla de la sección "Puntos" de la configuración.
// Trae la bonificación guardada y le muestra al Administrador el formulario para cambiarla.
import { StatusText } from '@/shared/components/feedback/StatusText';
import { Alert } from '@/shared/components/ui/Alert';
import { Card, CardTitle } from '@/shared/components/ui/Card';
import { useFirstPurchaseBonus } from '../api/points.queries';
import { FirstPurchaseBonusForm } from '../components/FirstPurchaseBonusForm';

// El título de la sección lo muestra el encabezado del modal de Configuración.
export function PointsSettingsPage() {
  const { data: bonus, isLoading, isError, refetch } = useFirstPurchaseBonus();

  return (
    <div className="space-y-6">
      {/* RF-011. Las demás configuraciones de puntos suman su propia Card. */}
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