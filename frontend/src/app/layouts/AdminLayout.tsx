// Layout para las vistas del rol Admin.
// El fondo (catálogo, misiones, clientes, etc.) queda como placeholder: pertenece
// a otros RF. Acá sólo se cablea la entrada a Configuración → Empleados y usuarios (RF-01).
import { useState } from 'react';
import { SessionActions } from '@/features/auth';
import { EmployeesPage } from '@/features/employees';
import { StatusText } from '@/shared/components/feedback/StatusText';
import { AppFooter, AppHeader } from '@/shared/components/navigation/AppHeader';
import { SideNav } from '@/shared/components/navigation/SideNav';
import { Icon } from '@/shared/components/ui/Icon';
import { ICONS } from '@/shared/components/ui/icons';
import { Modal } from '@/shared/components/ui/Modal';
import { appHeaderStyles } from '@/styles/ui';

const SECTIONS = [
  {
    id: 'employees',
    label: 'Empleados y usuarios',
    icon: ICONS.users,
    description: 'Cada empleado ingresa al sistema con su mail, según su rol.',
  },
  { id: 'points', label: 'Equivalencia de puntos', icon: ICONS.coins },
  { id: 'levels', label: 'Niveles de fidelización', icon: ICONS.award },
  { id: 'notifications', label: 'Notificaciones', icon: ICONS.bell },
] as const;

type Section = (typeof SECTIONS)[number];

export function AdminLayout() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>(SECTIONS[0]);

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader area="Administración">
        <SessionActions />
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

          <section className="min-w-0 flex-1">
            {activeSection.id === 'employees' ? (
              <EmployeesPage />
            ) : (
              <StatusText>{activeSection.label}: pendiente (otro RF).</StatusText>
            )}
          </section>
        </Modal>
      )}
    </div>
  );
}
