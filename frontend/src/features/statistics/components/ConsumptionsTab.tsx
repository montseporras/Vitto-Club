// Este archivo es la pestaña Consumos de Estadísticas (US-52, contrato S5 §3.9.7, S5-51): dos
// tarjetas de total y, debajo y lado a lado, los gráficos de columnas por día de la semana y
// por franja horaria.
import { formatInteger } from '@/shared/lib/numbers';
import {
  strongestIndex,
  timeSlotLabel,
  weekdayName,
  weekdayShortName,
} from '../lib/consumptions';
import { formatStatisticsMoney } from '../lib/format';
import type { ConsumptionsStatistics } from '../types/statistics';
import { ColumnsChart, type ChartColumn } from './ColumnsChart';
import { StatTile } from './StatTile';

// Paleta de la marca (S5-54): marrón con durazno claro para los días, turquesa con turquesa
// claro para las franjas.
const BROWN = '#a9532b';
const PEACH_LIGHT = '#f5c2a8';
const TURQUOISE = '#1b7f8c';
const TURQUOISE_LIGHT = '#a3d2da';

export function ConsumptionsTab({ data }: { data: ConsumptionsStatistics }) {
  const weekdays: ChartColumn[] = data.byWeekday.map((day) => ({
    key: String(day.weekday),
    label: weekdayShortName(day.weekday),
    fullLabel: weekdayName(day.weekday),
    count: day.count,
    amount: day.amount,
  }));
  const slots: ChartColumn[] = data.byTimeSlot.map((slot) => {
    const label = timeSlotLabel(slot.from, slot.to);
    return { key: label, label, fullLabel: label, count: slot.count, amount: slot.amount };
  });

  const strongestDay = strongestIndex(weekdays.map((column) => column.count));
  const strongestSlot = strongestIndex(slots.map((column) => column.count));

  return (
    <div className="mt-3.5 flex flex-1 flex-col gap-3.5">
      <div className="grid grid-cols-1 gap-3.5 min-[900px]:grid-cols-2">
        <StatTile
          label="Consumos"
          value={formatInteger(data.total.count)}
          help="Registrados en el mes"
          color={BROWN}
        />
        <StatTile
          label="Monto total"
          value={formatStatisticsMoney(data.total.amount)}
          help="Sin los consumos anulados"
          color={TURQUOISE}
        />
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3.5 min-[900px]:grid-cols-2">
        <ColumnsChart
          title="Por día de la semana"
          subtitle="Consumos de cada día del mes; abajo, el monto."
          strongestCaption="Día más fuerte"
          strongestName={strongestDay >= 0 ? weekdays[strongestDay].fullLabel : null}
          columns={weekdays}
          strongestIndex={strongestDay}
          strongColor={BROWN}
          softColor={PEACH_LIGHT}
          maxBarWidth={46}
        />
        <ColumnsChart
          title="Por franja horaria"
          subtitle="Consumos en cada franja de 4 horas; abajo, el monto."
          strongestCaption="Franja más fuerte"
          strongestName={strongestSlot >= 0 ? slots[strongestSlot].fullLabel : null}
          columns={slots}
          strongestIndex={strongestSlot}
          strongColor={TURQUOISE}
          softColor={TURQUOISE_LIGHT}
          maxBarWidth={64}
        />
      </div>
    </div>
  );
}
