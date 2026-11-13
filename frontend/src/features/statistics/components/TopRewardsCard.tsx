// Este archivo es la tarjeta "Recompensas más canjeadas" de la pestaña Programa (contrato S5 §3.9.7,
// S5-48): hasta 10 recompensas con puesto, nombre, barra, cantidad y porcentaje sobre el total de
// canjes usados del mes (`redemptionsUsed`).
import { formatInteger } from '@/shared/lib/numbers';
import { formatWholePercent, percentOf } from '../lib/format';
import type { ProgramStatistics } from '../types/statistics';
import { HorizontalBar } from './HorizontalBar';

interface TopRewardsCardProps {
  topRewards: ProgramStatistics['topRewards'];
  redemptionsUsed: number;
}

export function TopRewardsCard({ topRewards, redemptionsUsed }: TopRewardsCardProps) {
  // La barra se mide contra la recompensa con más canjes
  const biggest = Math.max(...topRewards.map((reward) => reward.used), 1);
  const used = formatInteger(redemptionsUsed);

  return (
    <section className="min-w-0 rounded-2xl border border-[#f6e4da] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(126,62,32,0.05)] [@media(max-height:820px)]:px-[18px] [@media(max-height:820px)]:py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg leading-tight font-bold text-[#2b1a10] [@media(max-height:820px)]:text-base">
            Recompensas más canjeadas
          </h3>
          <p className="mt-0 text-xs text-[#7a6e63] [@media(max-height:820px)]:text-[11px]">
            Canjes usados en el mes, de mayor a menor, y qué parte son del total ({used} canjes).
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-full bg-[#fde4d8] px-3 py-[5px] text-xs font-semibold whitespace-nowrap text-[#8a3d1c]">
          {used} canjes usados
        </span>
      </div>

      <div className="mt-2 border-t border-[#f8ebe3] pt-1 [@media(max-height:820px)]:mt-1 [@media(max-height:820px)]:pt-0.5 [@media(max-height:820px)]:columns-2 [@media(max-height:820px)]:gap-x-8">
        {topRewards.map((reward, index) => {
          const percent = formatWholePercent(percentOf(reward.used, redemptionsUsed));
          return (
            <div
              key={reward.id}
              title={`${reward.name}: ${formatInteger(reward.used)} canjes usados (${percent} de los ${used} del mes)`}
              className="grid break-inside-avoid grid-cols-[22px_minmax(120px,200px)_1fr_44px_44px] items-center gap-3 py-0.5 [@media(max-height:820px)]:py-0 [@media(max-height:820px)]:grid-cols-[22px_minmax(90px,160px)_1fr_36px_40px] [@media(max-height:820px)]:gap-2"
            >
              <span className="text-[11px] font-bold text-[#8a7d72] tabular-nums">{index + 1}</span>
              <span className="truncate text-sm text-[#2b1a10]">{reward.name}</span>
              <HorizontalBar percent={percentOf(reward.used, biggest)} color="#a9532b" />
              <span className="text-right text-sm font-bold tabular-nums">
                {formatInteger(reward.used)}
              </span>
              <span className="text-right text-[11px] text-[#7a6e63] tabular-nums">{percent}</span>
            </div>
          );
        })}
        {topRewards.length === 0 && (
          <p className="mt-2 text-sm text-[#5c5249]">No hubo canjes usados en el período.</p>
        )}
      </div>
    </section>
  );
}
