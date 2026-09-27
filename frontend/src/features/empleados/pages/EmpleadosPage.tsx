// Sección "Empleados y usuarios": listado y búsqueda (RF-01/RF-03), alta
// (RF-01), edición (RF-02) y baja lógica (RF-04) de empleados.
// Es la pantalla del prototipo dentro del modal de Configuración del Administrador;
// el título y la descripción los muestra el encabezado de ese modal.
import { useMemo, useState } from 'react';
import { StatusText } from '@/shared/components/feedback/StatusText';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { Icon } from '@/shared/components/ui/Icon';
import { ICONS } from '@/shared/components/ui/icons';
import { Modal } from '@/shared/components/ui/Modal';
import { useEmpleados } from '../api/empleados.queries';
import { BuscadorEmpleados } from '../components/BuscadorEmpleados';
import { ConfirmarBajaEmpleado } from '../components/ConfirmarBajaEmpleado';
import { FormEditarEmpleado } from '../components/FormEditarEmpleado';
import { FormRegistrarEmpleado } from '../components/FormRegistrarEmpleado';
import { TablaEmpleados } from '../components/TablaEmpleados';
import type { Empleado } from '../types/empleado';

export function EmpleadosPage() {
  const [creando, setCreando] = useState(false);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] =
    useState<Empleado | null>(null);
  const [dandoDeBaja, setDandoDeBaja] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const { data: empleados, isLoading, isError, refetch } = useEmpleados();

  const empleadosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return empleados;
    return empleados?.filter((empleado) =>
      `${empleado.firstName} ${empleado.lastName}`
        .toLowerCase()
        .includes(termino),
    );
  }, [empleados, busqueda]);

  const cerrarEdicion = () => {
    setEmpleadoSeleccionado(null);
    setDandoDeBaja(false);
  };

  return (
    <div>
      {empleados && empleados.length > 0 && (
        <div className="mb-6">
          <BuscadorEmpleados valor={busqueda} onCambiar={setBusqueda} />
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
        (empleados.length === 0 ? (
          <StatusText>Todavía no hay empleados registrados.</StatusText>
        ) : empleadosFiltrados && empleadosFiltrados.length > 0 ? (
          <TablaEmpleados
            empleados={empleadosFiltrados}
            onSeleccionarEmpleado={setEmpleadoSeleccionado}
          />
        ) : (
          <StatusText>
            No se encontraron empleados que coincidan con la búsqueda.
          </StatusText>
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
        <Modal title={dandoDeBaja ? 'Dar de baja empleado' : 'Editar empleado'}>
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
