// Este archivo es la pestaña Puntos de Estadísticas (US-53, contrato S5 §3.9.3 y §3.9.7, S5-51):
// cuatro tarjetas con la variación contra el mes anterior y, debajo y lado a lado, "De dónde
// salen los puntos" y "De los {n} acreditados…".
import { formatInteger } from '@/shared/lib/numbers';
import { formatPercent, percentOf } from '../lib/format';
import {
  cutoffLabel,
  lowerMonthName,
  monthLabel,
  previousMonthOf,
  shortLowerMonthName,
  toMonthParam,
  type YearMonth,
} from '../lib/period';
import { creditedTotal, variationText } from '../lib/points';
import type { PointsStatistics } from '../types/statistics';
import { PointsDestinationCard } from './PointsDestinationCard';
import { PointsKpiCard } from './PointsKpiCard';
import { PointsOriginCard } from './PointsOriginCard';

interface PointsTabProps {
  data: PointsStatistics;
  selected: YearMonth;
  today: YearMonth;
}

export function PointsTab({ data, selected, today }: PointsTabProps) {
  const previous = data.previousMonth;
  const previousMonth = previousMonthOf(selected);
  const previousName = shortLowerMonthName(previousMonth);
  const previousLabel = monthLabel(toMonthParam(previousMonth));

  const credited = creditedTotal(data);
  const previousCredited = creditedTotal(previous);

  // Título, valor, ayuda y colores de las cuatro tarjetas (paleta de la marca, S5-54).
  const cards = [
    {
      label: 'Acreditados',
      current: credited,
      before: previousCredited,
      help: 'Consumos, bonificación, misiones y cumpleaños',
      dotColor: '#a9532b',
      textColor: '#8a3d1c',
      pillBackground: '#f6e3da',
    },
    {
      label: 'Canjeados',
      current: data.redeemed,
      before: previous.redeemed,
      help: `${formatPercent(percentOf(data.redeemed, credited))} de lo acreditado`,
      dotColor: '#1b7f8c',
      textColor: '#1b7f8c',
      pillBackground: '#dff0f2',
    },
    {
      label: 'Vencidos',
      current: data.expired,
      before: previous.expired,
      help: 'Lotes que vencieron en el mes',
      dotColor: '#d4ae3a',
      textColor: '#9a7a17',
      pillBackground: '#f8f0d4',
    },
    {
      label: 'Anulados',
      current: data.voided,
      before: previous.voided,
      help: 'Restados al anular consumos',
      dotColor: '#e07a5f',
      textColor: '#c0573c',
      pillBackground: '#fbe3dc',
    },
  ];

  return (
    <div className="mt-3.5 flex flex-1 flex-col gap-3.5 [@media(max-height:820px)]:mt-2.5 [@media(max-height:820px)]:gap-2.5">
      <div className="grid grid-cols-2 gap-3.5 min-[1000px]:grid-cols-4 [@media(max-height:820px)]:gap-2.5">
        {cards.map((card) => (
          <PointsKpiCard
            key={card.label}
            label={card.label}
            value={formatInteger(card.current)}
            help={card.help}
            variation={variationText(card.current, card.before, previousName)}
            tooltip={`${card.label}: ${formatInteger(card.current)} pts · ${previousLabel}: ${formatInteger(card.before)} pts`}
            dotColor={card.dotColor}
            textColor={card.textColor}
            pillBackground={card.pillBackground}
          />
        ))}
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3.5 min-[900px]:grid-cols-2 [@media(max-height:820px)]:gap-2.5">
        <PointsOriginCard totals={data} cutoff={cutoffLabel(selected, today)} />
        <PointsDestinationCard totals={data} monthName={lowerMonthName(selected)} />
      </div>
    </div>
  );
}
