// Este archivo es la tarjeta "De los {n} acreditados…" de la pestaña Puntos (contrato S5 §3.9.7):
// cuatro columnas (Saldo neto, Canjeados, Vencidos y Anulados), cada una con su porcentaje de lo
// acreditado. La altura se mide contra el mayor valor absoluto. Hecho solo con CSS.
import { formatInteger, formatSignedInteger } from '@/shared/lib/numbers';
import { Icon } from '@/shared/components/ui/Icon';
import { formatPercent, percentOf } from '../lib/format';
import { STATISTICS_ICONS } from '../lib/icons';
import { creditedTotal, netBalance } from '../lib/points';
import type { PointsTotals } from '../types/statistics';

interface Column {
  key: string;
  label: string;
  points: number;
  /** Texto del número: el Saldo neto lleva signo. */
  valueText: string;
  barColor: string;
  labelColor: string;
  valueColor: string;
}

interface PointsDestinationCardProps {
  totals: PointsTotals;
  /** Nombre del mes en minúscula ("noviembre"), para el texto del pie. */
  monthName: string;
}

export function PointsDestinationCard({ totals, monthName }: PointsDestinationCardProps) {
  const credited = creditedTotal(totals);
  const net = netBalance(totals);

  const columns: Column[] = [
    {
      key: 'net',
      label: 'Saldo neto',
      points: net,
      valueText: formatSignedInteger(net),
      barColor: '#4a2414',
      labelColor: '#2b1a10',
      valueColor: '#2b1a10',
    },
    {
      key: 'redeemed',
      label: 'Canjeados',
      points: totals.redeemed,
      valueText: formatInteger(totals.redeemed),
      barColor: '#1b7f8c',
      labelColor: '#1b7f8c',
      valueColor: '#1b7f8c',
    },
    {
      key: 'expired',
      label: 'Vencidos',
      points: totals.expired,
      valueText: formatInteger(totals.expired),
      barColor: '#d4ae3a',
      labelColor: '#9a7a17',
      valueColor: '#9a7a17',
    },
    {
      key: 'voided',
      label: 'Anulados',
      points: totals.voided,
      valueText: formatInteger(totals.voided),
      barColor: '#e07a5f',
      labelColor: '#c0573c',
      valueColor: '#c0573c',
    },
  ];
  const biggest = Math.max(...columns.map((column) => Math.abs(column.points)), 1);

  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-[#f6e4da] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(126,62,32,0.05)] [@media(max-height:820px)]:py-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg leading-tight font-bold text-[#2b1a10] [@media(max-height:820px)]:text-base">
            De los {formatInteger(credited)} acreditados…
          </h3>
          <p className="mt-0.5 text-xs text-[#7a6e63] [@media(max-height:820px)]:text-[11px]">
            Distribución del total acreditado en el mes según su destino final.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-[#fde4d8] px-2.5 py-[3px] text-[11px] font-semibold whitespace-nowrap text-[#8a3d1c]">
          Distribución neta
        </span>
      </div>

      <div className="mt-3 flex flex-1 flex-col rounded-[14px] border border-[#fbe8de] bg-[#fffaf7] px-[18px] pt-1.5 pb-2.5">
        <div
          role="list"
          aria-label={`De los ${formatInteger(credited)} acreditados`}
          className="flex min-h-[140px] flex-1 items-end gap-7 border-b border-[#efe1d6] pt-[18px] [@media(max-height:820px)]:min-h-[100px] bg-[repeating-linear-gradient(to_top,transparent_0,transparent_34px,#f6e6dc_34px,#f6e6dc_35px)]"
        >
          {columns.map((column) => {
            const label = `${column.label}: ${formatInteger(column.points)} pts (${formatPercent(percentOf(column.points, credited))} de lo acreditado)`;
            const height = Math.max(2, Math.round((Math.abs(column.points) / biggest) * 100));
            return (
              <div
                key={column.key}
                role="listitem"
                aria-label={label}
                title={label}
                className="group flex h-full min-w-0 flex-1 cursor-default flex-col items-center justify-end gap-1"
              >
                <span
                  className="text-xs font-bold tracking-[-0.01em] tabular-nums"
                  style={{ color: column.valueColor }}
                >
                  {column.valueText}
                </span>
                <div
                  className="w-full rounded-t-md group-hover:brightness-95"
                  style={{
                    height: `${column.points !== 0 ? height : 0}%`,
                    maxWidth: 52,
                    minHeight: 2,
                    backgroundColor: column.barColor,
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 flex gap-7" aria-hidden="true">
          {columns.map((column) => (
            <div
              key={column.key}
              className="min-w-0 flex-1 text-center text-xs leading-[1.3] font-semibold whitespace-nowrap"
              style={{ color: column.labelColor }}
            >
              {column.label}
              <small className="block text-[10px] font-semibold tracking-[-0.02em] text-[#7a6e63] tabular-nums">
                {formatPercent(percentOf(column.points, credited))}
              </small>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2.5 border-t border-[#f8ebe3] pt-2.5 text-xs text-[#5c5249] [@media(max-height:820px)]:mt-2 [@media(max-height:820px)]:pt-1.5">
        <Icon d={STATISTICS_ICONS.shield} className="size-4 shrink-0 text-[#a9532b]" />
        <span>
          Los puntos que sumaron al saldo en {monthName} quedan en circulación: son los que el café
          todavía puede tener que honrar.
        </span>
      </div>
    </section>
  );
}
