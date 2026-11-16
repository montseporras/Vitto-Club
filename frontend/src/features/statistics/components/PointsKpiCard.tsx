// Este archivo es una de las cuatro tarjetas de la pestaña Puntos (contrato S5 §3.9.7): punto de
// color, título, variación contra el mes anterior, número grande y una ayuda. La variación usa el
// color de su tarjeta, suba o baje (como el prototipo).
interface PointsKpiCardProps {
  label: string;
  value: string;
  help: string;
  /** Variación ya armada: "▲ 8,5 % vs. oct." o "Sin datos de oct.". */
  variation: string;
  /** Texto al pasar el mouse. */
  tooltip: string;
  dotColor: string;
  textColor: string;
  pillBackground: string;
}

export function PointsKpiCard({
  label,
  value,
  help,
  variation,
  tooltip,
  dotColor,
  textColor,
  pillBackground,
}: PointsKpiCardProps) {
  return (
    <div
      title={tooltip}
      className="min-w-0 rounded-lg border border-[#eee6dd] bg-[#fdfbf9] shadow-[0_1px_3px_rgba(126,62,32,0.08),0_10px_24px_-14px_rgba(126,62,32,0.18)] px-5 py-4 [@media(max-height:820px)]:py-2.5"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          aria-hidden="true"
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
        <span
          className="text-[10.5px] font-bold tracking-[0.06em] uppercase"
          style={{ color: textColor }}
        >
          {label}
        </span>
        <span
          className="ml-auto rounded px-[7px] py-0.5 text-[10.5px] font-bold whitespace-nowrap max-[1100px]:ml-0"
          style={{ backgroundColor: pillBackground, color: textColor }}
        >
          {variation}
        </span>
      </div>
      {/* Todos los números de la pantalla: misma letra, en negrita y con cifras del mismo ancho */}
      <div className="mt-1.5 text-2xl leading-[1.1] font-bold tracking-[-0.01em] text-[#2b1a10] font-stats tabular-nums [@media(max-height:820px)]:mt-0 [@media(max-height:820px)]:text-xl">
        {value}
      </div>
      <hr className="my-2.5 border-t border-[#f3e4da] [@media(max-height:820px)]:my-0.5" />
      <div className="text-xs text-[#7a6e63] [@media(max-height:820px)]:text-[11px]">{help}</div>
    </div>
  );
}
