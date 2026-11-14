// Este archivo es la pestaña Clientes de Estadísticas (US-51, contrato S5 §3.9.7, S5-51, S5-55):
// sin gráficos, con tres tarjetas y la conversión de los clientes nuevos.
import { ICONS } from '@/shared/components/ui/icons';
import { formatInteger } from '@/shared/lib/numbers';
import { STATISTICS_ICONS } from '../lib/icons';
import { monthLabel } from '../lib/period';
import type { ClientsStatistics } from '../types/statistics';
import { ClientsKpiCard } from './ClientsKpiCard';
import { NewClientsConversion } from './NewClientsConversion';

// Colores de la paleta de la marca (S5-54): marrón y turquesa.
const BROWN = '#a9532b';
const TURQUOISE = '#1b7f8c';

interface ClientsTabProps {
  data: ClientsStatistics;
  /** Mes elegido arriba ('YYYY-MM'). */
  month: string;
  /** Mes de la conversión que se está viendo; null = el elegido arriba. */
  conversionMonth: string | null;
  onSelectConversionMonth: (month: string) => void;
}

export function ClientsTab({
  data,
  month,
  conversionMonth,
  onSelectConversionMonth,
}: ClientsTabProps) {
  const min = data.frequentMinConsumptions;

  return (
    <div className="mt-3.5 flex flex-1 flex-col gap-3.5">
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
        <ClientsKpiCard
          title="Clientes activos"
          value={formatInteger(data.active)}
          label="Base vigente"
          icon={STATISTICS_ICONS.userCheck}
          iconColor={BROWN}
          help="No dados de baja al cierre del mes"
          tooltip={`Clientes activos: ${formatInteger(data.active)}`}
        />
        <ClientsKpiCard
          title="Clientes nuevos"
          value={formatInteger(data.new)}
          label="Adquisición"
          icon={ICONS.userPlus}
          iconColor={TURQUOISE}
          help={`Dados de alta en ${monthLabel(month)}`}
          helpColor={TURQUOISE}
          helpIcon={STATISTICS_ICONS.trend}
          tooltip={`Clientes nuevos: ${formatInteger(data.new)}`}
        />
        <ClientsKpiCard
          title="Frecuentes"
          value={formatInteger(data.frequent)}
          label="Fidelidad"
          icon={STATISTICS_ICONS.star}
          iconColor={BROWN}
          help={`≥ ${min} consumos en el mes (mínimo configurable)`}
          helpAsChip
          tooltip={`Frecuentes (al menos ${min} consumos): ${formatInteger(data.frequent)}`}
        />
      </div>

      <NewClientsConversion
        last6Months={data.last6Months}
        minConsumptions={min}
        selectedMonth={conversionMonth ?? month}
        onSelectMonth={onSelectConversionMonth}
      />
    </div>
  );
}
