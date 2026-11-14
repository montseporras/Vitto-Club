// Este archivo es la tarjeta "Clientes por nivel" de la pestaña Programa (contrato S5 §3.9.7, S5-47):
// la torta con Bronce, Plata y Oro y, debajo, el porcentaje de clientes que subieron de nivel
// en el mes (a cualquier nivel), con su barra.
import { formatInteger } from '@/shared/lib/numbers';
import { formatWholePercent, percentOf } from '../lib/format';
import { levelSlices, sliceTotal } from '../lib/program';
import type { ProgramStatistics } from '../types/statistics';
import { HorizontalBar } from './HorizontalBar';
import { PieChart } from './PieChart';

export function LevelsCard({ data }: { data: ProgramStatistics }) {
  const slices = levelSlices(data.levels);
  // Los clientes activos son la suma de los tres niveles (el nivel actual de los activos)
  const activeCustomers = sliceTotal(slices);
  const risen = percentOf(data.levelUps, activeCustomers);
  const risenText = formatWholePercent(risen);

  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-[#f6e4da] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(126,62,32,0.05)] [@media(max-height:820px)]:px-[18px] [@media(max-height:820px)]:py-2">
      <h3 className="text-lg leading-tight font-bold text-[#2b1a10] [@media(max-height:820px)]:text-base">
        Clientes por nivel
      </h3>
      <p className="mt-0 text-xs text-[#7a6e63] [@media(max-height:820px)]:text-[11px]">
        Nivel actual de los clientes activos.
      </p>

      <div className="mt-2 [@media(max-height:820px)]:mt-0">
        <PieChart slices={slices} total={activeCustomers} centerLabel="clientes" />
      </div>

      <div
        className="mt-auto border-t border-[#f8ebe3] pt-2.5 text-xs [@media(max-height:820px)]:pt-1.5 [@media(max-height:820px)]:text-[11px]"
        title={`${formatInteger(data.levelUps)} de ${formatInteger(activeCustomers)} clientes activos subieron de nivel`}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm text-[#2b1a10]">Subieron de nivel en el mes</span>
          <span className="text-lg leading-6 font-bold text-[#a9532b] tabular-nums">{risenText}</span>
        </div>
        <div
          role="img"
          aria-label={`Subieron de nivel ${risenText} de los clientes activos`}
          className="mt-1.5 [@media(max-height:820px)]:mt-1"
        >
          <HorizontalBar percent={risen} color="#ffa47e" />
        </div>
        <p className="mt-1.5 text-[#7a6e63] [@media(max-height:820px)]:mt-0">
          {formatInteger(data.levelUps)} {data.levelUps === 1 ? 'cliente pasó' : 'clientes pasaron'} a
          un nivel más alto, a cualquiera.
        </p>
      </div>
    </section>
  );
}
