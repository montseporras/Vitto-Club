// Este archivo es una tarjeta de total con una franja de color a la izquierda (pestaña Consumos,
// contrato S5 §3.9.7): título chico, número grande y una ayuda debajo.
interface StatTileProps {
  label: string;
  value: string;
  help: string;
  /** Color de la franja de la izquierda. */
  color: string;
}

export function StatTile({ label, value, help, color }: StatTileProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#f6e4da] bg-white py-3.5 pr-[18px] pl-6 [@media(max-height:820px)]:py-2.5">
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ backgroundColor: color }}
      />
      <div className="text-[10.5px] font-bold tracking-[0.06em] text-[#8a3d1c] uppercase">
        {label}
      </div>
      {/* Todos los números de la pantalla: misma letra, en negrita y con cifras del mismo ancho */}
      <div className="mt-1.5 text-[30px] leading-[1.1] font-bold tracking-[-0.01em] text-[#2b1a10] tabular-nums [@media(max-height:820px)]:mt-0.5 [@media(max-height:820px)]:text-[25px]">
        {value}
      </div>
      <div className="mt-1 text-xs text-[#7a6e63]">{help}</div>
    </div>
  );
}
