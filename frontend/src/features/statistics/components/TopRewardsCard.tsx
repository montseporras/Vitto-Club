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
    <section className="min-w-0 flex-1 rounded-lg border border-[#eee6dd] bg-[#fdfbf9] px-5 py-4 shadow-[0_1px_3px_rgba(126,62,32,0.08),0_10px_24px_-14px_rgba(126,62,32,0.18)] [@media(max-height:820px)]:px-[18px] [@media(max-height:820px)]:py-2">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#f1ebe4] pb-3">
        <div>
          <h3 className="text-lg leading-tight font-bold text-[#2b1a10] [@media(max-height:820px)]:text-base">
            Recompensas más canjeadas
          </h3>
          <p className="mt-0 text-xs text-[#7a6e63] [@media(max-height:820px)]:text-[11px]">
            Canjes usados en el mes, de mayor a menor, y qué parte son del total ({used} canjes).
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center rounded bg-[#efe7de] px-3 py-[3px] text-xs font-semibold whitespace-nowrap text-[#5c4033]">
          {used} canjes usados
        </span>
      </div>

      <div className="mt-2 pt-1 [@media(max-height:820px)]:mt-1 [@media(max-height:820px)]:pt-0.5 [@media(max-height:820px)]:columns-2 [@media(max-height:820px)]:gap-x-8">
        {topRewards.map((reward, index) => {
          const percent = formatWholePercent(percentOf(reward.used, redemptionsUsed));
          return (
            <div
              key={reward.id}
              title={`${reward.name}: ${formatInteger(reward.used)} canjes usados (${percent} de los ${used} del mes)`}
              className="grid break-inside-avoid grid-cols-[22px_1fr_auto_auto] items-center gap-x-2 gap-y-1 py-1.5 sm:grid-cols-[24px_minmax(120px,220px)_1fr_48px_52px] sm:gap-3 sm:py-1 [@media(max-height:820px)]:py-0 [@media(max-height:820px)]:grid-cols-[22px_minmax(90px,170px)_1fr_40px_46px] [@media(max-height:820px)]:gap-2"
            >
              <span className="text-xs font-bold text-[#8a7d72] font-stats tabular-nums">{index + 1}</span>
              <span className="truncate text-sm leading-5 text-[#2b1a10]">{reward.name}</span>
              <div className="max-sm:order-last max-sm:col-span-3 max-sm:col-start-2 sm:contents">
                <HorizontalBar percent={percentOf(reward.used, biggest)} color="#b5826a" />
              </div>
              <span className="text-right text-sm leading-5 font-bold font-stats tabular-nums">
                {formatInteger(reward.used)}
              </span>
              <span className="text-right text-xs text-[#7a6e63] font-stats tabular-nums">{percent}</span>
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
