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
      barColor: '#b09a8b',
      labelColor: '#2b1a10',
      valueColor: '#2b1a10',
    },
    {
      key: 'redeemed',
      label: 'Canjeados',
      points: totals.redeemed,
      valueText: formatInteger(totals.redeemed),
      barColor: '#589ea6',
      labelColor: '#1b7f8c',
      valueColor: '#1b7f8c',
    },
    {
      key: 'expired',
      label: 'Vencidos',
      points: totals.expired,
      valueText: formatInteger(totals.expired),
      barColor: '#ceb17c',
      labelColor: '#9a7a17',
      valueColor: '#9a7a17',
    },
    {
      key: 'voided',
      label: 'Anulados',
      points: totals.voided,
      valueText: formatInteger(totals.voided),
      barColor: '#c96856',
      labelColor: '#c0573c',
      valueColor: '#c0573c',
    },
  ];
  const biggest = Math.max(...columns.map((column) => Math.abs(column.points)), 1);

  return (
    <section className="flex min-w-0 flex-col rounded-lg border border-[#eee6dd] bg-[#fdfbf9] px-5 py-4 shadow-[0_1px_3px_rgba(126,62,32,0.08),0_10px_24px_-14px_rgba(126,62,32,0.18)] [@media(max-height:820px)]:py-3">
      <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1 border-b border-[#f1ebe4] pb-3">
        <div>
          <h3 className="text-lg leading-tight font-bold text-[#2b1a10] [@media(max-height:820px)]:text-base">
            De los {formatInteger(credited)} acreditados…
          </h3>
          <p className="mt-0.5 text-xs text-[#7a6e63] [@media(max-height:820px)]:text-[11px]">
            Distribución del total acreditado en el mes según su destino final.
          </p>
        </div>
        <span className="inline-flex items-center rounded bg-[#efe7de] px-2.5 py-[3px] text-[11px] font-semibold whitespace-nowrap text-[#5c4033]">
          Distribución neta
        </span>
      </div>

      <div className="mt-3 hidden flex-1 flex-col rounded-md border border-[#f1ebe4] bg-[#fbf8f5] px-[18px] pt-1.5 pb-2.5 sm:flex">
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
                  className="text-xs font-bold tracking-[-0.01em] font-stats tabular-nums"
                  style={{ color: column.valueColor }}
                >
                  {column.valueText}
                </span>
                <div
                  className="w-full rounded-t-sm group-hover:brightness-95"
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
              <small className="block text-[10px] font-semibold tracking-[-0.02em] text-[#7a6e63] font-stats tabular-nums">
                {formatPercent(percentOf(column.points, credited))}
              </small>
            </div>
          ))}
        </div>
      </div>

      {/* Celular: una barra horizontal por dato */}
      <ul
        aria-label={`De los ${formatInteger(credited)} acreditados`}
        className="mt-3 flex flex-col gap-3 rounded-md border border-[#f1ebe4] bg-[#fbf8f5] p-3.5 sm:hidden"
      >
        {columns.map((column) => {
          const width =
            column.points !== 0 ? Math.max(2, Math.round((Math.abs(column.points) / biggest) * 100)) : 0;
          return (
            <li
              key={column.key}
              title={`${column.label}: ${formatInteger(column.points)} pts`}
              className="grid grid-cols-[5.25rem_1fr_4.5rem] items-center gap-x-2.5"
            >
              <span className="text-xs font-semibold" style={{ color: column.labelColor }}>
                {column.label}
              </span>
              <div className="h-3 overflow-hidden rounded-sm bg-[#fdebe2]">
                <div
                  className="h-full rounded-sm"
                  style={{ width: `${width}%`, backgroundColor: column.barColor }}
                />
              </div>
              <span className="text-right leading-tight">
                <strong className="text-xs font-stats tabular-nums" style={{ color: column.valueColor }}>
                  {column.valueText}
                </strong>
                <small className="block text-[10px] font-semibold font-stats tabular-nums text-[#7a6e63]">
                  {formatPercent(percentOf(column.points, credited))}
                </small>
              </span>
            </li>
          );
        })}
      </ul>

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
