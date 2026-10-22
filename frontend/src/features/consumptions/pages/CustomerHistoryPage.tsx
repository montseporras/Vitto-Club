// Pantalla "Historial" de la vista del Cliente (US-23).
// Trae su propio encabezado porque el layout del Cliente (US-19, otra rama) todavía no tiene
// la barra de pestañas: cuando exista, esta página pasa a renderizarse dentro de ese layout.
import { SessionActions } from '@/features/auth';
import { AppFooter, AppHeader } from '@/shared/components/navigation/AppHeader';
import { CustomerConsumptionHistory } from '../components/CustomerConsumptionHistory';

export function CustomerHistoryPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader area="Mi cuenta" showBack={false}>
        <SessionActions />
      </AppHeader>

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <CustomerConsumptionHistory />
      </main>

      <AppFooter />
    </div>
  );
}
