// Este archivo es la torta de Estadísticas, hecha solo con CSS (`conic-gradient`, sin librería,
// S5-27 y S5-46): un círculo con un hueco en el medio donde va el total, y al lado la leyenda con
// color, etiqueta, cantidad y porcentaje. Cada fila de la leyenda muestra su detalle al pasar el mouse.
import { formatInteger } from '@/shared/lib/numbers';
import { formatWholePercent, percentOf } from '../lib/format';
import type { PieSlice } from '../lib/program';

interface PieChartProps {
  slices: PieSlice[];
  total: number;
  /** Lo que va debajo del total, en el centro: "clientes" o "asignadas". */
  centerLabel: string;
}

const GAP_DEGREES = 1.5;

/** Arma el `conic-gradient`: cada porción en su color, con un hueco blanco de 1,5° entre porciones. */
function gradientOf(slices: PieSlice[], total: number): string {
  const visible = slices.filter((slice) => slice.count > 0);
  if (total <= 0 || visible.length === 0) return '#f7efe8 0deg 360deg';
  const gap = visible.length > 1 ? GAP_DEGREES : 0;
  let start = 0;
  const stops: string[] = [];
  for (const slice of visible) {
    const size = (slice.count / total) * 360;
    const end = Math.max(start, start + size - gap);
    stops.push(`${slice.color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`);
    if (gap) stops.push(`#ffffff ${end.toFixed(2)}deg ${(start + size).toFixed(2)}deg`);
    start += size;
  }
  return stops.join(', ');
}

export function PieChart({ slices, total, centerLabel }: PieChartProps) {
  const summary = slices.map((slice) => `${slice.label} ${slice.count}`).join(', ');

  return (
    <div className="flex items-center gap-7 [@media(max-height:820px)]:gap-5">
      <div
        role="img"
        aria-label={summary}
        className="relative size-[124px] shrink-0 rounded-full [@media(max-height:820px)]:size-[88px]"
        style={{ background: `conic-gradient(${gradientOf(slices, total)})` }}
      >
        {/* Hueco del medio, con el total */}
        <div className="absolute inset-[21%] flex flex-col items-center justify-center rounded-full bg-white text-center leading-[1.1]">
          <span className="text-[22px] font-bold tracking-[-0.01em] text-[#2b1a10] tabular-nums [@media(max-height:820px)]:text-base">
            {formatInteger(total)}
          </span>
          <span className="mt-0.5 text-[11px] text-[#7a6e63]">{centerLabel}</span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        {slices.map((slice) => {
          const percent = formatWholePercent(percentOf(slice.count, total));
          return (
            <div
              key={slice.key}
              title={`${slice.label}: ${formatInteger(slice.count)} (${percent})`}
              className="flex items-start gap-2.5 py-1 text-[13px] text-[#2b1a10] [@media(max-height:820px)]:py-0.5 [@media(max-height:820px)]:text-xs"
            >
              <span
                aria-hidden="true"
                className="mt-1 size-[11px] shrink-0 rounded-[3px]"
                style={{ backgroundColor: slice.color }}
              />
              <span className="min-w-0 flex-1">
                {slice.label}
                {slice.help && (
                  <span className="block text-[11px] leading-[1.25] text-[#7a6e63] [@media(max-height:820px)]:text-[10.5px]">
                    {slice.help}
                  </span>
                )}
              </span>
              <span className="font-bold tabular-nums">{formatInteger(slice.count)}</span>
              <span className="min-w-10 text-right text-[11px] text-[#7a6e63] tabular-nums">
                {percent}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
