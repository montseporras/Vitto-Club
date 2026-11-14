// Este archivo es la tarjeta "Conversión de clientes nuevos" de la pestaña Clientes (contrato S5
// §3.9.7, S5-53): de los clientes dados de alta en un mes, cuántos llegaron al mínimo de
// frecuente en ese mismo mes. Se elige entre los 6 meses de `last6Months`.
import { Icon } from '@/shared/components/ui/Icon';
import { cn } from '@/shared/lib/utils';
import { formatInteger } from '@/shared/lib/numbers';
import { conversionPercent } from '../lib/format';
import { STATISTICS_ICONS } from '../lib/icons';
import { monthLabel, shortMonthLabel } from '../lib/period';
import type { ClientsLastMonth } from '../types/statistics';

interface NewClientsConversionProps {
  last6Months: ClientsLastMonth[];
  minConsumptions: number;
  /** Mes que se está mostrando ('YYYY-MM'). */
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
}

export function NewClientsConversion({
  last6Months,
  minConsumptions,
  selectedMonth,
  onSelectMonth,
}: NewClientsConversionProps) {
  // Por defecto, el mes elegido arriba; si no está en la lista, el último.
  const current = last6Months.find((m) => m.month === selectedMonth) ?? last6Months[last6Months.length - 1];

  return (
    <section
      aria-labelledby="conversion-title"
      className="flex flex-1 flex-col rounded-2xl border border-[#f6e4da] bg-white px-[22px] py-[18px] shadow-[0_1px_2px_rgba(126,62,32,0.05)] [@media(max-height:820px)]:py-2.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f8ebe3] pb-3.5 [@media(max-height:820px)]:pb-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fde4d8]">
            <Icon d={STATISTICS_ICONS.userCheck} className="size-5 text-[#a9532b]" />
          </span>
          <h3 id="conversion-title" className="text-[19px] leading-tight font-bold text-[#2b1a10]">
            Conversión de clientes nuevos · {monthLabel(current.month)}
          </h3>
          <span className="inline-flex items-center rounded-full bg-[#fde4d8] px-2.5 py-[3px] text-[11px] font-semibold whitespace-nowrap text-[#8a3d1c]">
            ≥ {minConsumptions} consumos
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#7a6e63]">Período analizado:</span>
          <div className="flex gap-0.5 rounded-[10px] bg-[#fdf3ee] p-[3px]">
            {last6Months.map((item) => {
              const selected = item.month === current.month;
              return (
                <button
                  key={item.month}
                  type="button"
                  aria-pressed={selected}
                  title={`${monthLabel(item.month)}: ${formatInteger(item.newFrequent)} de ${formatInteger(item.new)} nuevos (${conversionPercent(item.newFrequent, item.new)} %)`}
                  onClick={() => onSelectMonth(item.month)}
                  className={cn(
                    'cursor-pointer rounded-lg px-2.5 py-1 text-xs',
                    selected
                      ? 'bg-[#a9532b] font-bold text-white'
                      : 'text-[#5c4033] hover:bg-[#fde4d8]',
                  )}
                >
                  {shortMonthLabel(item.month)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center py-3 [@media(max-height:820px)]:py-1">
        <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
          <span className="text-[46px] leading-none font-bold tracking-[-0.01em] text-[#8a3d1c] tabular-nums">
            {conversionPercent(current.newFrequent, current.new)}
            <span className="ml-0.5 text-[28px]">%</span>
          </span>
          <span className="font-heading text-xl font-bold text-[#2b1a10]">
            llegaron a {minConsumptions} consumos o más
          </span>
        </div>
        <p className="mt-1.5 text-[13px] font-semibold text-[#5c5249]">
          {formatInteger(current.newFrequent)}{' '}
          {current.newFrequent === 1 ? 'cliente frecuente' : 'clientes frecuentes'} de{' '}
          {formatInteger(current.new)} clientes nuevos
        </p>
      </div>

      <div className="flex items-center gap-2.5 border-t border-[#f8ebe3] pt-2.5 text-xs text-[#8a7d72] [@media(max-height:820px)]:pt-1.5">
        <Icon d={STATISTICS_ICONS.info} className="size-3.5 shrink-0 text-[#8a7d72]" />
        <span>
          Clientes dados de alta en el mes que llegaron al mínimo de frecuente en ese mismo mes. El
          mínimo se cambia en Configuración → Puntos.
        </span>
      </div>
    </section>
  );
}
