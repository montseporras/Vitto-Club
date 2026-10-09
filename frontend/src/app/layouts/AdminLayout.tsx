// Este archivo es el marco de las pantallas del Administrador: encabezado, engranaje y
// modal de Configuración. Decide qué pantalla de cada feature se muestra en cada sección.
//
// El fondo (catálogo, misiones, clientes, etc.) queda como placeholder: pertenece
// a otros RF. Acá se cablean las secciones de Configuración ya implementadas:
// Empleados (RF-01) y Puntos (RF-011).
import { useState } from 'react';
import { EmployeesPage } from '@/features/employees';
// NUEVO (cambio 1): la pantalla de puntos, importada desde la API pública del
// feature (su index.ts, archivo 10), nunca desde sus carpetas internas.
import { PointsSettingsPage } from '@/features/points';
import { StatusText } from '@/shared/components/feedback/StatusText';
import { AppFooter, AppHeader } from '@/shared/components/navigation/AppHeader';
import { SideNav } from '@/shared/components/navigation/SideNav';
import { Icon } from '@/shared/components/ui/Icon';
import { ICONS } from '@/shared/components/ui/icons';
import { Modal } from '@/shared/components/ui/Modal';
import { appHeaderStyles } from '@/styles/ui';

// Secciones del menú lateral del modal de Configuración.
const SECTIONS = [
  {
    id: 'employees',
    label: 'Empleados',
    icon: ICONS.users,
    description: 'Cada empleado ingresa al sistema con su mail, según su rol.',
  },
  // MODIFICADO (cambio 2): se agregó `description`, el texto chico que aparece
  // bajo el título del modal. Es general a propósito: esta sección también va
  // a tener "puntos por cada $1000" y "vigencia" de otras historias.
  {
    id: 'points',
    label: 'Puntos',
    icon: ICONS.coins,
    description: 'Reglas con las que los clientes suman puntos en sus compras.',
  },
  { id: 'levels', label: 'Niveles de fidelización', icon: ICONS.award },
  { id: 'notifications', label: 'Notificaciones', icon: ICONS.bell },
] as const;

type Section = (typeof SECTIONS)[number];

export function AdminLayout() {
  // ¿Está abierto el modal de Configuración?
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Sección elegida en el menú lateral (arranca en la primera).
  const [activeSection, setActiveSection] = useState<Section>(SECTIONS[0]);

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader area="Administración">
        <span className={appHeaderStyles.meta}>
          Denise Nagel · Administrador
        </span>
        {/* El engranaje: abre el modal de Configuración. */}
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
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

      {settingsOpen && (
        <Modal
          label="Configuración"
          eyebrow="Configuración"
          title={activeSection.label}
          description={'description' in activeSection ? activeSection.description : undefined}
          onClose={() => setSettingsOpen(false)}
          className="min-h-[70vh] max-w-5xl"
          bodyClassName="flex flex-1 gap-6 px-5 py-6 sm:px-6"
        >
          <SideNav
            label="Secciones de configuración"
            title="Secciones"
            size="md"
            storageKey="vitto:menu-configuracion"
            className="self-start"
            items={SECTIONS.map((item) => ({
              id: item.id,
              label: item.label,
              icon: item.icon,
              active: item.id === activeSection.id,
              onSelect: () => setActiveSection(item),
            }))}
          />

          {/* Contenido de la sección elegida. */}
          <section className="min-w-0 flex-1">
            {activeSection.id === 'employees' ? (
              <EmployeesPage />
            ) : activeSection.id === 'points' ? (
              // MODIFICADO (cambio 3): antes "points" caía en el texto
              // "pendiente (otro RF)"; ahora muestra la pantalla nueva.
              <PointsSettingsPage />
            ) : (
              // Niveles y Notificaciones siguen pendientes (otras historias).
              <StatusText>{activeSection.label}: pendiente (otro RF).</StatusText>
            )}
          </section>
        </Modal>
      )}
    </div>
  );
}