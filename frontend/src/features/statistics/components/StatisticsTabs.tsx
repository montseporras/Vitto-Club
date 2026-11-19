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
      className="grid grid-cols-2 gap-1.5 lg:grid-cols-4"
    >
      {tabs.map((tab) => {
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
              'relative flex min-w-0 cursor-pointer items-center gap-1.5 rounded px-2.5 py-2 text-left text-sm transition-colors sm:gap-2.5 sm:px-3.5 sm:text-[15px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a9532b] [@media(min-height:821px)]:py-2.5',
              active
                ? 'bg-[#8e3f1d] font-bold text-white'
                : 'font-medium text-[#5c4033] hover:bg-[#f6f2ed] hover:text-[#7e3e20]',
            )}
          >
            <Icon d={tab.icon} className={cn('size-4 shrink-0 sm:size-[18px]', active ? 'text-white' : 'text-[#a9532b]')} />
            <span className="min-w-0 flex-1 truncate">{tab.label}</span>
            <span
              className={cn(
                'shrink-0 rounded px-1.5 py-0.5 text-xs font-bold font-stats tabular-nums sm:px-[9px]',
                active ? 'bg-black/15 text-white' : 'bg-[#efe7de] text-[#5c4033]',
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
