// Este archivo es la pestaña Programa de Estadísticas (US-54, contrato S5 §3.9.4 y §3.9.7, S5-51):
// arriba y lado a lado, "Clientes por nivel" y "Misiones asignadas"; abajo, a lo ancho,
// "Recompensas más canjeadas".
import { cutoffLabel, isCurrentMonth, type YearMonth } from '../lib/period';
import type { ProgramStatistics } from '../types/statistics';
import { LevelsCard } from './LevelsCard';
import { MissionsCard } from './MissionsCard';
import { TopRewardsCard } from './TopRewardsCard';

interface ProgramTabProps {
  data: ProgramStatistics;
  selected: YearMonth;
  today: YearMonth;
}

export function ProgramTab({ data, selected, today }: ProgramTabProps) {
  return (
    <div className="mt-3.5 flex flex-1 flex-col gap-3.5 [@media(max-height:820px)]:mt-2.5 [@media(max-height:820px)]:gap-2.5">
      <div className="grid grid-cols-1 gap-3.5 min-[900px]:grid-cols-2 [@media(max-height:820px)]:gap-2.5">
        <LevelsCard data={data} />
        <MissionsCard
          missions={data.missions}
          isCurrentMonth={isCurrentMonth(selected, today)}
          cutoff={cutoffLabel(selected, today)}
        />
      </div>
      <TopRewardsCard topRewards={data.topRewards} redemptionsUsed={data.redemptionsUsed} />
    </div>
  );
}
