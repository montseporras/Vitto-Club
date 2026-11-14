// Este archivo son las cuatro pestañas de Estadísticas, a lo ancho y cada una con su total
// (contrato S5 §3.9.7): clientes activos, consumos del mes, "+{puntos acreditados}" y misiones asignadas.
import { Icon } from '@/shared/components/ui/Icon';
import { cn } from '@/shared/lib/utils';

export type StatisticsTabId = 'clients' | 'consumptions' | 'points' | 'program';

export interface StatisticsTabItem {
  id: StatisticsTabId;
  label: string;
  icon: string;
  /** Total que va en la insignia de la pestaña, ya formateado. */
  total: string;
  /** Texto que se ve al pasar el mouse. */
  title: string;
}

interface StatisticsTabsProps {
  tabs: StatisticsTabItem[];
  selected: StatisticsTabId;
  onSelect: (id: StatisticsTabId) => void;
}

export function StatisticsTabs({ tabs, selected, onSelect }: StatisticsTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Secciones de estadísticas"
      className="grid grid-cols-2 gap-3 rounded-[18px] border border-[#f6e4da] bg-white p-[7px] shadow-[0_2px_6px_-2px_rgba(126,62,32,0.08)] lg:grid-cols-4"
    >
      {tabs.map((tab, index) => {
        const active = tab.id === selected;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`statistics-tab-${tab.id}`}
            aria-selected={active}
            aria-controls="statistics-panel"
            title={tab.title}
            onClick={() => onSelect(tab.id)}
            className={cn(
              'relative flex min-w-0 cursor-pointer items-center gap-2.5 rounded-xl px-3.5 py-2 text-left text-[15px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a9532b] [@media(min-height:821px)]:py-2.5',
              active
                ? 'bg-[#a9532b] font-bold text-white shadow-[0_6px_14px_-6px_rgba(169,83,43,0.6)]'
                : 'font-medium text-[#5c4033] hover:bg-[#fdeee6] hover:text-[#7e3e20]',
            )}
          >
            {/* Línea fina entre pestañas */}
            {index > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-[22%] bottom-[22%] -left-[7px] hidden w-px bg-[#f0dfd4] lg:block"
              />
            )}
            <Icon d={tab.icon} className={cn('size-[18px] shrink-0', active ? 'text-white' : 'text-[#a9532b]')} />
            <span className="min-w-0 flex-1 truncate">{tab.label}</span>
            <span
              className={cn(
                'shrink-0 rounded-full px-[9px] py-0.5 text-xs font-bold tabular-nums',
                active ? 'bg-white/20 text-white' : 'bg-[#fde2d6] text-[#8a3d1c]',
              )}
            >
              {tab.total}
            </span>
          </button>
        );
      })}
    </div>
  );
}
