// Sección "Empleados y usuarios": listado y búsqueda (RF-01/RF-03), alta
// (RF-01), edición (RF-02) y baja lógica (RF-04) de empleados.
// Es la pantalla del prototipo dentro del modal de Configuración del Administrador;
// el título y la descripción los muestra el encabezado de ese modal.
import { useState } from 'react';
import { StatusText } from '@/shared/components/feedback/StatusText';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { Icon } from '@/shared/components/ui/Icon';
import { ICONS } from '@/shared/components/ui/icons';
import { Modal } from '@/shared/components/ui/Modal';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useEmpleados } from '../api/empleados.queries';
import { BuscadorEmpleados } from '../components/BuscadorEmpleados';
import { ConfirmarBajaEmpleado } from '../components/ConfirmarBajaEmpleado';
import { FormEditarEmpleado } from '../components/FormEditarEmpleado';
import { FormRegistrarEmpleado } from '../components/FormRegistrarEmpleado';
import { TablaEmpleados } from '../components/TablaEmpleados';
import type { Empleado } from '../types/empleado';

// Mismo máximo que acepta el backend en ?name= (más largo responde 400).
const MAX_BUSQUEDA = 80;

export function EmpleadosPage() {
  const [creando, setCreando] = useState(false);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] =
    useState<Empleado | null>(null);
  const [dandoDeBaja, setDandoDeBaja] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  // La búsqueda la resuelve el backend (GET /empleados?name=): se espera a que
  // el usuario deje de tipear para no pedir en cada tecla.
  const termino = useDebounce(busqueda.trim(), 300);
  const {
    data: empleados,
    isLoading,
    isError,
    refetch,
  } = useEmpleados(termino);

  const cerrarEdicion = () => {
    setEmpleadoSeleccionado(null);
    setDandoDeBaja(false);
  };

  const hayBusqueda = termino !== '';

  return (
    <div>
      {(hayBusqueda || busqueda !== '' || (empleados?.length ?? 0) > 0) && (
        <div className="mb-6">
          <BuscadorEmpleados
            valor={busqueda}
            onCambiar={(valor) => setBusqueda(valor.slice(0, MAX_BUSQUEDA))}
          />
        </div>
      )}

      {isLoading && <StatusText>Cargando empleados…</StatusText>}

      {isError && (
        <Alert variant="error">
          <p>
            No se pudieron cargar los empleados.{' '}
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

      {empleados &&
        !isError &&
        (empleados.length > 0 ? (
          <TablaEmpleados
            empleados={empleados}
            onSeleccionarEmpleado={setEmpleadoSeleccionado}
          />
        ) : hayBusqueda ? (
          <StatusText>
            No se encontraron empleados que coincidan con la búsqueda.
          </StatusText>
        ) : (
          <StatusText>Todavía no hay empleados registrados.</StatusText>
        ))}

      <Button
        type="button"
        size="lg"
        onClick={() => setCreando(true)}
        className="mt-6 w-full sm:w-auto"
      >
        <Icon d={ICONS.plus} />
        Registrar empleado
      </Button>

      {creando && (
        <Modal title="Crear empleado">
          <FormRegistrarEmpleado
            onSuccess={() => setCreando(false)}
            onCancel={() => setCreando(false)}
          />
        </Modal>
      )}

      {empleadoSeleccionado && (
        <Modal
          title={
            dandoDeBaja
              ? 'Dar de baja empleado'
              : empleadoSeleccionado.isActive
                ? 'Editar empleado'
                : 'Empleado dado de baja'
          }
        >
          {dandoDeBaja ? (
            <ConfirmarBajaEmpleado
              empleado={empleadoSeleccionado}
              onSuccess={cerrarEdicion}
              onCancel={() => setDandoDeBaja(false)}
            />
          ) : (
            <FormEditarEmpleado
              empleado={empleadoSeleccionado}
              onSuccess={cerrarEdicion}
              onCancel={cerrarEdicion}
              onSolicitarBaja={() => setDandoDeBaja(true)}
            />
          )}
        </Modal>
      )}
    </div>
  );
}
