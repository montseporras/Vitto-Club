// Este archivo es la tarjeta "Misiones asignadas" de la pestaña Programa (contrato S5 §3.9.7,
// S5-50): la torta por estado de las misiones del mes (En progreso solo si es el mes actual), la
// tasa de efectividad y el "Corte".
import { formatWholePercent } from '../lib/format';
import { effectivenessRate, missionSlices } from '../lib/program';
import type { ProgramStatistics } from '../types/statistics';
import { PieChart } from './PieChart';

interface MissionsCardProps {
  missions: ProgramStatistics['missions'];
  isCurrentMonth: boolean;
  /** "Corte: dd/mm/aaaa" */
  cutoff: string;
}

export function MissionsCard({ missions, isCurrentMonth, cutoff }: MissionsCardProps) {
  const slices = missionSlices(missions, isCurrentMonth);

  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-[#f6e4da] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(126,62,32,0.05)] [@media(max-height:820px)]:px-[18px] [@media(max-height:820px)]:py-2.5">
      <h3 className="text-lg leading-tight font-bold text-[#2b1a10] [@media(max-height:820px)]:text-base">
        Misiones asignadas
      </h3>
      <p className="mt-0 text-xs text-[#7a6e63] [@media(max-height:820px)]:text-[11px]">
        Estado de todas las misiones que se asignaron a los clientes en el mes.
      </p>

      {missions.assigned > 0 ? (
        <div className="mt-3 [@media(max-height:820px)]:mt-1">
          <PieChart slices={slices} total={missions.assigned} centerLabel="asignadas" />
        </div>
      ) : (
        <p className="mt-3 text-sm text-[#5c5249]">No hubo misiones en el período.</p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2.5 border-t border-[#f8ebe3] pt-2.5 text-[11px] text-[#8a7d72] [@media(max-height:820px)]:pt-1.5">
        <span>
          Tasa de efectividad:{' '}
          <strong className="font-bold text-[#5c5249] tabular-nums">
            {formatWholePercent(effectivenessRate(missions))}
          </strong>{' '}
          de las misiones se completaron
        </span>
        <span className="font-semibold whitespace-nowrap text-[#a9532b]">Corte: {cutoff}</span>
      </div>
    </section>
  );
}
