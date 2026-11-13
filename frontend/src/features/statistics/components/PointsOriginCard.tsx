// Este archivo es la tarjeta "De dónde salen los puntos" de la pestaña Puntos (contrato S5 §3.9.7):
// la barra de Consumos con "Origen principal" y, debajo, los "Puntos extra" con una barra por
// cada uno. Las barras de los extras se comparan entre sí, no contra el total.
import { formatInteger } from '@/shared/lib/numbers';
import { formatPercent, percentOf } from '../lib/format';
import { creditedTotal, extraRows, extrasTotal } from '../lib/points';
import type { PointsTotals } from '../types/statistics';
import { HorizontalBar } from './HorizontalBar';

const BROWN = '#a9532b';
const TAUPE = '#74645a';

interface PointsOriginCardProps {
  totals: PointsTotals;
  /** "Corte: dd/mm/aaaa" */
  cutoff: string;
}

export function PointsOriginCard({ totals, cutoff }: PointsOriginCardProps) {
  const credited = creditedTotal(totals);
  const extras = extrasTotal(totals);
  const rows = extraRows(totals);
  const biggestExtra = Math.max(...rows.map((row) => row.points), 1);

  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-[#f6e4da] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(126,62,32,0.05)] [@media(max-height:820px)]:py-3">
      <h3 className="text-lg leading-tight font-bold text-[#2b1a10] [@media(max-height:820px)]:text-base">De dónde salen los puntos</h3>
      <p className="mt-0.5 text-xs text-[#7a6e63] [@media(max-height:820px)]:text-[11px]">
        Puntos acreditados en el mes, según el origen.
      </p>

      <div
        className="mt-3.5 [@media(max-height:820px)]:mt-2"
        title={`Consumos: ${formatInteger(totals.awarded)} pts (${formatPercent(percentOf(totals.awarded, credited))})`}
      >
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-[#a9532b]" />
          <span className="text-[15px] font-semibold text-[#2b1a10]">Consumos</span>
          <span className="inline-flex items-center rounded-full bg-[#fde4d8] px-2.5 py-[3px] text-[11px] font-semibold whitespace-nowrap text-[#8a3d1c]">
            Origen principal
          </span>
          <span className="ml-auto text-[15px] font-bold tabular-nums">
            {formatInteger(totals.awarded)}
          </span>
          <span className="min-w-11 text-right text-[11px] text-[#7a6e63] tabular-nums">
            {formatPercent(percentOf(totals.awarded, credited))}
          </span>
        </div>
        <div className="mt-2">
          <HorizontalBar percent={percentOf(totals.awarded, credited)} color={BROWN} height={10} />
        </div>
      </div>

      <div className="mt-3.5 border-t border-[#f8ebe3] pt-3 [@media(max-height:820px)]:mt-2 [@media(max-height:820px)]:pt-1.5">
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold text-[#a9532b]">Puntos extra</span>
          <span className="text-xs text-[#8a7d72]">(bonificación, misiones y cumpleaños)</span>
          <span className="ml-auto text-[15px] font-bold text-[#a9532b] tabular-nums">
            {formatInteger(extras)}
          </span>
          <span className="min-w-11 text-right text-[11px] text-[#7a6e63] tabular-nums">
            {formatPercent(percentOf(extras, credited))}
          </span>
        </div>

        {rows.map((row) => (
          <div
            key={row.key}
            className="mt-2.5 [@media(max-height:820px)]:mt-1"
            title={`${row.label}: ${formatInteger(row.points)} pts (${formatPercent(percentOf(row.points, credited))} del total)${row.noLevel ? '. No cuenta para el nivel.' : ''}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-[#2b1a10]">{row.label}</span>
              {row.noLevel && (
                <span className="inline-flex items-center rounded-full bg-[#fde4d8] px-2 py-px text-[10px] font-semibold whitespace-nowrap text-[#8a6a5c]">
                  No suma nivel
                </span>
              )}
              <span className="ml-auto text-[13px] font-bold tabular-nums">
                {formatInteger(row.points)}
              </span>
              <span className="min-w-11 text-right text-[11px] text-[#7a6e63] tabular-nums">
                {formatPercent(percentOf(row.points, credited))}
              </span>
            </div>
            <div className="mt-[5px]">
              <HorizontalBar
                percent={percentOf(row.points, biggestExtra)}
                color={TAUPE}
                height={6}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2.5 border-t border-[#f8ebe3] pt-2.5 text-[11px] text-[#8a7d72] [@media(max-height:820px)]:pt-1.5">
        <em>Las barras de los extras se comparan entre sí, no contra el total.</em>
        <span className="font-semibold whitespace-nowrap text-[#a9532b]">Corte: {cutoff}</span>
      </div>
    </section>
  );
}
