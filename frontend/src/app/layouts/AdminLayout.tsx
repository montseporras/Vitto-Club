// Este archivo es el marco de las pantallas del Administrador: encabezado, engranaje y
// modal de Configuración. Decide qué pantalla de cada feature se muestra en cada sección.
//
// El menú lateral lleva a las pantallas del Administrador (el router las pone en el <Outlet>):
// Clientes (CLI-ADM), Auditoría y Consumos ya están; el resto muestra "Próximamente". Acá se
// cablean también las secciones de Configuración ya implementadas: Empleados (RF-01) y
// Puntos (RF-011).
import { useState } from 'react';
import { Link, Outlet } from 'react-router';
import { PATHS } from '@/app/router/paths';
import { SessionActions } from '@/features/auth';
import { EmployeesPage } from '@/features/employees';
// NUEVO (cambio 1): la pantalla de puntos, importada desde la API pública del
// feature (su index.ts, archivo 10), nunca desde sus carpetas internas.
import { PointsSettingsPage } from '@/features/points';
import { StatusText } from '@/shared/components/feedback/StatusText';
import { AppFooter, AppHeader } from '@/shared/components/navigation/AppHeader';
import { SideNav, type SideNavItem } from '@/shared/components/navigation/SideNav';
import { Icon } from '@/shared/components/ui/Icon';
import { ICONS } from '@/shared/components/ui/icons';
import { Modal } from '@/shared/components/ui/Modal';
import { appHeaderStyles } from '@/styles/ui';

// Menú lateral del Administrador, en el orden del prototipo v2. Recompensas, Misiones y
// Estadísticas son de otros sprints: deshabilitadas con "Próx.", como en el prototipo. El resto
// de las opciones que todavía no están construidas abre una pantalla "Próximamente".
const SOON = 'Próx.';
const NAV: SideNavItem[] = [
  { id: 'rewards', disabled: true, tag: SOON, label: 'Catálogo de recompensas', icon: ICONS.gift },
  { id: 'missions', disabled: true, tag: SOON, label: 'Misiones', icon: ICONS.target },
  { id: 'customers', to: PATHS.admin.customers, label: 'Clientes', icon: ICONS.users },
  {
    id: 'statistics',
    disabled: true,
    tag: SOON,
    label: 'Estadísticas y reportes',
    icon: ICONS.chart,
  },
  { id: 'audit', to: PATHS.admin.audit, label: 'Auditoría', icon: ICONS.history },
  { id: 'consumptions', to: PATHS.admin.consumptions, label: 'Consumos', icon: ICONS.receipt },
];

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
    description: 'Reglas con las que los clientes suman puntos en sus consumos.',
  },
  // Otro sprint: deshabilitada con "Próx.", como en el prototipo v2
  { id: 'notifications', label: 'Notificaciones', icon: ICONS.bell, soon: true },
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
        {/* El Administrador también opera el mostrador: acceso directo a lo que ve el Cajero */}
        <Link to={PATHS.cashier.root} className={appHeaderStyles.action}>
          <Icon d={ICONS.ticket} className="size-4" />
          Caja
        </Link>
        <SessionActions />
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

      {/* Igual que el mostrador: el menú pegado a la izquierda y el contenido en el espacio que sobra */}
      <div className="flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:gap-8 lg:py-8">
        <aside className="lg:shrink-0">
          <SideNav
            label="Opciones de administración"
            title="Menú de administración"
            items={NAV}
            storageKey="vitto:menu-admin"
            collapsibleFrom="(min-width: 64rem)"
            className="lg:sticky lg:top-24"
          />
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      <AppFooter />

      {settingsOpen && (
        <Modal
          label="Configuración"
          eyebrow="Configuración"
          title={activeSection.label}
          description={'description' in activeSection ? activeSection.description : undefined}
          onClose={() => setSettingsOpen(false)}
          // Medidas del prototipo v2: hasta 1280 px de ancho y el 92 % del alto de la ventana
          className="h-[92vh] max-h-[92vh] max-w-7xl"
          bodyClassName="flex flex-1 gap-6 px-5 py-6 sm:px-6"
        >
          <SideNav
            label="Secciones de configuración"
            title="Secciones"
            size="md"
            storageKey="vitto:menu-configuracion"
            className="self-start"
            items={SECTIONS.map((item): SideNavItem =>
              'soon' in item
                ? { id: item.id, label: item.label, icon: item.icon, disabled: true, tag: SOON }
                : {
                    id: item.id,
                    label: item.label,
                    icon: item.icon,
                    active: item.id === activeSection.id,
                    onSelect: () => setActiveSection(item),
                  },
            )}
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
              // No se llega: Notificaciones está deshabilitada en el menú. Los niveles van dentro de Puntos.
              <StatusText>{activeSection.label}: pendiente (otro RF).</StatusText>
            )}
          </section>
        </Modal>
      )}
    </div>
  );
}