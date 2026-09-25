// Sección "Empleados y usuarios": listado y búsqueda (RF-01/RF-03), alta
// (RF-01), edición (RF-02) y baja lógica (RF-04) de empleados.
// Es la pantalla del prototipo dentro del modal de Configuración del Administrador.
import { useMemo, useState } from 'react';
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
      <h2 className="text-2xl font-extrabold">Empleados y usuarios</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Cada empleado ingresa al sistema con su mail, según su rol.
      </p>

      {empleados && empleados.length > 0 && (
        <div className="mt-4">
          <BuscadorEmpleados valor={busqueda} onCambiar={setBusqueda} />
        </div>
      )}

      <div className="mt-6">
        {isLoading && (
          <p className="text-[var(--text-muted)]">Cargando empleados…</p>
        )}

        {isError && (
          <div className="text-red-600">
            <p>No se pudieron cargar los empleados.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-2 underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {empleados &&
          (empleados.length === 0 ? (
            <p className="text-[var(--text-muted)]">
              Todavía no hay empleados registrados.
            </p>
          ) : empleadosFiltrados && empleadosFiltrados.length > 0 ? (
            <TablaEmpleados
              empleados={empleadosFiltrados}
              onSeleccionarEmpleado={setEmpleadoSeleccionado}
            />
          ) : (
            <p className="text-[var(--text-muted)]">
              No se encontraron empleados que coincidan con la búsqueda.
            </p>
          ))}
      </div>

      <button
        type="button"
        onClick={() => setCreando(true)}
        className="mt-6 rounded bg-accent-500 px-4 py-2 font-medium text-white hover:bg-accent-700"
      >
        + Registrar empleado
      </button>

      {creando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Crear empleado"
        >
          <div className="w-full max-w-md rounded bg-[var(--surface)] p-6 shadow-xl">
            <h3 className="mb-4 text-xl font-extrabold">Crear empleado</h3>
            <FormRegistrarEmpleado
              onSuccess={() => setCreando(false)}
              onCancel={() => setCreando(false)}
            />
          </div>
        </div>
      )}

      {empleadoSeleccionado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={dandoDeBaja ? 'Dar de baja empleado' : 'Editar empleado'}
        >
          <div className="w-full max-w-md rounded bg-[var(--surface)] p-6 shadow-xl">
            <h3 className="mb-4 text-xl font-extrabold">
              {dandoDeBaja ? 'Dar de baja empleado' : 'Editar empleado'}
            </h3>
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
          </div>
        </div>
      )}
    </div>
  );
}
