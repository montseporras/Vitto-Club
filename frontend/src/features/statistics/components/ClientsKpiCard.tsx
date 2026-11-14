// Este archivo es una de las tres tarjetas de la pestaña Clientes: título arriba, número
// grande, etiqueta debajo y una ayuda al pie (contrato S5 §3.9.7, S5-55).
import { Icon } from '@/shared/components/ui/Icon';
import { STATISTICS_ICONS } from '../lib/icons';

interface ClientsKpiCardProps {
  title: string;
  value: string;
  /** "Base vigente", "Adquisición" o "Fidelidad". */
  label: string;
  icon: string;
  iconColor: string;
  /** Texto chico al pie. Si es `chip`, va dentro de una pastilla. */
  help: string;
  helpAsChip?: boolean;
  helpColor?: string;
  helpIcon?: string;
  tooltip: string;
}

export function ClientsKpiCard({
  title,
  value,
  label,
  icon,
  iconColor,
  help,
  helpAsChip,
  helpColor = '#8a7d72',
  helpIcon,
  tooltip,
}: ClientsKpiCardProps) {
  return (
    <div
      title={tooltip}
      className="min-w-0 rounded-2xl border border-[#f6e4da] bg-white px-5 py-4 [@media(max-height:820px)]:py-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-bold tracking-[0.06em] text-[#8a3d1c] uppercase">
          {title}
        </span>
        <span className="grid size-8 place-items-center rounded-full bg-[#fde4d8]">
          <Icon d={icon} className="size-4" style={{ color: iconColor }} />
        </span>
      </div>
      {/* Todos los números de la pantalla: misma letra, en negrita y con cifras del mismo ancho */}
      <div className="mt-1 text-[38px] leading-[1.1] font-bold tracking-[-0.01em] text-[#2b1a10] tabular-nums [@media(max-height:820px)]:text-[34px]">
        {value}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-[#8a3d1c]">{label}</div>
      <hr className="my-2.5 border-t border-[#f3e4da] [@media(max-height:820px)]:my-1" />
      {helpAsChip ? (
        <span className="inline-flex items-center rounded-full bg-[#fde4d8] px-2.5 py-[3px] text-[11px] font-semibold text-[#8a3d1c]">
          {help}
        </span>
      ) : (
        <div className="flex items-center gap-1.5 text-xs" style={{ color: helpColor }}>
          <Icon d={helpIcon ?? STATISTICS_ICONS.info} className="size-3.5 shrink-0" />
          {help}
        </div>
      )}
    </div>
  );
}
