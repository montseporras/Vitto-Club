// Sección "Empleados y usuarios" (RF-01): listado + alta de empleados.
// Es la pantalla del prototipo dentro del modal de Configuración del Administrador.
import { useState } from 'react';
import { useEmpleados } from '../api/empleados.queries';
import { FormRegistrarEmpleado } from '../components/FormRegistrarEmpleado';
import { TablaEmpleados } from '../components/TablaEmpleados';

export function EmpleadosPage() {
  const [creando, setCreando] = useState(false);
  const { data: empleados, isLoading, isError, refetch } = useEmpleados();

  return (
    <div>
      <h2 className="text-2xl font-extrabold">Empleados y usuarios</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Cada empleado ingresa al sistema con su mail, según su rol.
      </p>

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
          (empleados.length > 0 ? (
            <TablaEmpleados empleados={empleados} />
          ) : (
            <p className="text-[var(--text-muted)]">
              Todavía no hay empleados registrados.
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
    </div>
  );
}
