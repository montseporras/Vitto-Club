// Este archivo es la pantalla "Estadísticas y reportes" del Administrador (US-51, contrato S5 §3.9.7).
// Pide los cuatro endpoints al cambiar el mes, porque cada pestaña muestra un total.
// Por ahora solo la pestaña Clientes tiene contenido; Consumos, Puntos y Programa las arman
// US-52, US-53 y US-54 sobre este mismo marco.
import { useState } from 'react';
import { StatusText } from '@/shared/components/feedback/StatusText';
import { Alert } from '@/shared/components/ui/Alert';
import { AdminPanel } from '@/shared/components/ui/AdminPanel';
import { formatInteger } from '@/shared/lib/numbers';
import {
  useClientsStatistics,
  useConsumptionsStatistics,
  usePointsStatistics,
  useProgramStatistics,
} from '../api/statistics.queries';
import { ClientsTab } from '../components/ClientsTab';
import { PeriodSelectors } from '../components/PeriodSelectors';
import {
  StatisticsTabs,
  type StatisticsTabId,
  type StatisticsTabItem,
} from '../components/StatisticsTabs';
import { TAB_ICONS } from '../lib/icons';
import {
  clampToToday,
  currentArgentinaMonth,
  isCurrentMonth,
  monthLabel,
  toMonthParam,
  type YearMonth,
} from '../lib/period';

export function StatisticsPage() {
  // El mes actual en hora de Argentina; se calcula una sola vez al abrir la pantalla.
  const [today] = useState(currentArgentinaMonth);
  const [selected, setSelected] = useState<YearMonth>(today);
  const [tab, setTab] = useState<StatisticsTabId>('clients');
  // Mes de la conversión de clientes nuevos; vuelve a su valor por defecto al cambiar de mes.
  const [conversionMonth, setConversionMonth] = useState<string | null>(null);

  const month = toMonthParam(selected);
  const clients = useClientsStatistics(month);
  const consumptions = useConsumptionsStatistics(month);
  const points = usePointsStatistics(month);
  const program = useProgramStatistics(month);

  const changePeriod = (next: YearMonth) => {
    setSelected(clampToToday(next, today));
    setConversionMonth(null);
  };

  const isLoading =
    clients.isLoading || consumptions.isLoading || points.isLoading || program.isLoading;
  const isError = clients.isError || consumptions.isError || points.isError || program.isError;

  const refetchAll = () => {
    void clients.refetch();
    void consumptions.refetch();
    void points.refetch();
    void program.refetch();
  };

  let tabs: StatisticsTabItem[] | null = null;
  if (clients.data && consumptions.data && points.data && program.data) {
    // Puntos acreditados = consumos + bonificación + misiones + cumpleaños (contrato §3.9.7)
    const credited =
      points.data.awarded +
      points.data.bonus +
      points.data.missionRewards +
      points.data.birthdayBonus;
    tabs = [
      {
        id: 'clients',
        label: 'Clientes',
        icon: TAB_ICONS.clients,
        total: formatInteger(clients.data.active),
        title: `${formatInteger(clients.data.active)} clientes activos`,
      },
      {
        id: 'consumptions',
        label: 'Consumos',
        icon: TAB_ICONS.consumptions,
        total: formatInteger(consumptions.data.total.count),
        title: `${formatInteger(consumptions.data.total.count)} consumos en el mes`,
      },
      {
        id: 'points',
        label: 'Puntos',
        icon: TAB_ICONS.points,
        total: `+${formatInteger(credited)}`,
        title: `${formatInteger(credited)} puntos acreditados en el mes`,
      },
      {
        id: 'program',
        label: 'Programa',
        icon: TAB_ICONS.program,
        total: formatInteger(program.data.missions.assigned),
        title: `${formatInteger(program.data.missions.assigned)} misiones asignadas en el mes`,
      },
    ];
  }

  return (
    <AdminPanel
      title="Estadísticas y reportes"
      titleSuffix={
        <span className="inline-flex items-center rounded-full bg-[#fde4d8] px-2.5 py-[3px] text-xs font-semibold whitespace-nowrap text-[#8a3d1c]">
          Período: {monthLabel(month)}
          {isCurrentMonth(selected, today) && ' (mes en curso)'}
        </span>
      }
      subtitle="Elegí el mes y el año para ver los números del programa."
      actions={<PeriodSelectors selected={selected} today={today} onChange={changePeriod} />}
    >
      {isError ? (
        <Alert variant="error">
          <p>
            No se pudieron cargar las estadísticas.{' '}
            <button
              type="button"
              onClick={refetchAll}
              className="cursor-pointer font-semibold underline underline-offset-2"
            >
              Reintentar
            </button>
          </p>
        </Alert>
      ) : isLoading || !tabs || !clients.data ? (
        <StatusText>Cargando…</StatusText>
      ) : (
        <div className="flex flex-1 flex-col">
          <StatisticsTabs tabs={tabs} selected={tab} onSelect={setTab} />
          <div
            id="statistics-panel"
            role="tabpanel"
            aria-labelledby={`statistics-tab-${tab}`}
            className="flex flex-1 flex-col"
          >
            {tab === 'clients' && (
              <ClientsTab
                data={clients.data}
                month={month}
                conversionMonth={conversionMonth}
                onSelectConversionMonth={setConversionMonth}
              />
            )}
          </div>
        </div>
      )}
    </AdminPanel>
  );
}
