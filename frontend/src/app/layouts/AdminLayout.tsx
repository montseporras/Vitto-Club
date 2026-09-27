// Layout para las vistas del rol Admin.
// El fondo (catálogo, misiones, clientes, etc.) queda como placeholder: pertenece
// a otros RF. Acá sólo se cablea la entrada a Configuración → Empleados y usuarios (RF-01).
import { useState } from 'react';
import { EmpleadosPage } from '@/features/empleados';

const SECCIONES = [
  'Empleados y usuarios',
  'Equivalencia de puntos',
  'Niveles de fidelización',
  'Notificaciones',
] as const;

type Seccion = (typeof SECCIONES)[number];

export function AdminLayout() {
  const [configAbierta, setConfigAbierta] = useState(false);
  const [seccion, setSeccion] = useState<Seccion>('Empleados y usuarios');

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-[var(--border)] bg-white px-6 py-4">
        <h1 className="text-xl font-extrabold">Vitto Club — Administración</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--text-muted)]">
            Denise Nagel · Administrador
          </span>
          <button
            type="button"
            onClick={() => setConfigAbierta(true)}
            aria-label="Abrir configuración"
            className="text-2xl leading-none text-[var(--text-muted)] hover:text-[var(--text-heading)]"
          >
            ⚙
          </button>
        </div>
      </header>

      {/* Fondo del admin: fuera del alcance de RF-01. */}
      <main className="p-6 text-[var(--text-muted)]">
        <p>Área de administración (pantallas de otros RF).</p>
      </main>

      {configAbierta && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Configuración"
        >
          <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded bg-[var(--surface)] shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-muted)] px-6 py-4">
              <h2 className="text-xl font-extrabold">Configuración</h2>
              <button
                type="button"
                onClick={() => setConfigAbierta(false)}
                className="font-medium text-accent-700 hover:underline"
              >
                Cerrar ✕
              </button>
            </div>

            <div className="flex flex-1 gap-6 overflow-y-auto p-6">
              <nav className="flex w-56 shrink-0 flex-col gap-2">
                {SECCIONES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSeccion(item)}
                    className={
                      item === seccion
                        ? 'rounded bg-accent-500 px-4 py-2 text-left font-medium text-white'
                        : 'rounded border border-[var(--border)] px-4 py-2 text-left font-medium text-[var(--text-heading)] hover:bg-[var(--surface-muted)]'
                    }
                  >
                    {item}
                  </button>
                ))}
              </nav>

              <section className="flex-1">
                {seccion === 'Empleados y usuarios' ? (
                  <EmpleadosPage />
                ) : (
                  <p className="text-[var(--text-muted)]">
                    {seccion}: pendiente (otro RF).
                  </p>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
