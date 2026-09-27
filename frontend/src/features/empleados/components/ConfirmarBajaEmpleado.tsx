// Confirmación de baja de empleado (RF-04), embebida en el modal de edición.
// Baja lógica: el empleado deja de estar activo pero el registro se conserva.
import { FormActions } from '@/shared/components/forms/FormActions';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { useDarDeBajaEmpleado } from '../api/empleados.queries';
import type { Empleado } from '../types/empleado';

interface ConfirmarBajaEmpleadoProps {
  empleado: Empleado;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ConfirmarBajaEmpleado({
  empleado,
  onSuccess,
  onCancel,
}: ConfirmarBajaEmpleadoProps) {
  const darDeBaja = useDarDeBajaEmpleado();

  const confirmar = () => {
    darDeBaja.mutate(empleado.id, { onSuccess });
  };

  return (
    <div>
      {darDeBaja.isError && (
        <Alert variant="error" className="mb-6">
          No se pudo dar de baja al empleado. Intentá nuevamente.
        </Alert>
      )}

      <p className="text-base text-text">
        ¿Dar de baja a{' '}
        <strong>
          {empleado.firstName} {empleado.lastName}
        </strong>
        ? Va a dejar de poder ingresar al sistema.
      </p>

      <FormActions>
        <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={confirmar}
          disabled={darDeBaja.isPending}
        >
          {darDeBaja.isPending ? 'Dando de baja…' : 'Dar de baja'}
        </Button>
      </FormActions>
    </div>
  );
}
