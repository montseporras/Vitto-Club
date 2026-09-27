// Layout para las vistas del rol Admin.
// El fondo (catálogo, misiones, clientes, etc.) queda como placeholder: pertenece
// a otros RF. Acá sólo se cablea la entrada a Configuración → Empleados y usuarios (RF-01).
import { useState } from 'react';
import { EmpleadosPage } from '@/features/empleados';
import { StatusText } from '@/shared/components/feedback/StatusText';
import { AppFooter, AppHeader } from '@/shared/components/navigation/AppHeader';
import { SideNav } from '@/shared/components/navigation/SideNav';
import { Icon } from '@/shared/components/ui/Icon';
import { ICONS } from '@/shared/components/ui/icons';
import { Modal } from '@/shared/components/ui/Modal';
import { appHeaderStyles } from '@/styles/ui';

const SECCIONES = [
  {
    id: 'empleados',
    label: 'Empleados y usuarios',
    icon: ICONS.users,
    description: 'Cada empleado ingresa al sistema con su mail, según su rol.',
  },
  { id: 'puntos', label: 'Equivalencia de puntos', icon: ICONS.coins },
  { id: 'niveles', label: 'Niveles de fidelización', icon: ICONS.award },
  { id: 'notificaciones', label: 'Notificaciones', icon: ICONS.bell },
] as const;

type Seccion = (typeof SECCIONES)[number];

export function AdminLayout() {
  const [configAbierta, setConfigAbierta] = useState(false);
  const [seccion, setSeccion] = useState<Seccion>(SECCIONES[0]);

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader area="Administración">
        <span className={appHeaderStyles.meta}>
          Denise Nagel · Administrador
        </span>
        <button
          type="button"
          onClick={() => setConfigAbierta(true)}
          aria-label="Abrir configuración"
          title="Configuración"
          className={appHeaderStyles.iconButton}
        >
          <Icon
            d={ICONS.settings}
            className="size-5 transition-transform duration-500 group-hover:rotate-90"
          />
        </button>
      </AppHeader>

      {/* Fondo del admin: fuera del alcance de RF-01. */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:py-8">
        <StatusText>Área de administración (pantallas de otros RF).</StatusText>
      </main>

      <AppFooter />

      {configAbierta && (
        <Modal
          label="Configuración"
          eyebrow="Configuración"
          title={seccion.label}
          description={'description' in seccion ? seccion.description : undefined}
          onClose={() => setConfigAbierta(false)}
          className="min-h-[70vh] max-w-5xl"
          bodyClassName="flex flex-1 gap-6 px-5 py-6 sm:px-6"
        >
          <SideNav
            label="Secciones de configuración"
            title="Secciones"
            size="md"
            storageKey="vitto:menu-configuracion"
            className="self-start"
            items={SECCIONES.map((item) => ({
              id: item.id,
              label: item.label,
              icon: item.icon,
              active: item.id === seccion.id,
              onSelect: () => setSeccion(item),
            }))}
          />

          <section className="min-w-0 flex-1">
            {seccion.id === 'empleados' ? (
              <EmpleadosPage />
            ) : (
              <StatusText>{seccion.label}: pendiente (otro RF).</StatusText>
            )}
          </section>
        </Modal>
      )}
    </div>
  );
}
