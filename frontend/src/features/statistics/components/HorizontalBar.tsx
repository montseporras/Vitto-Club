// Este archivo es una barra horizontal hecha solo con CSS (sin librería, S5-27): una pista clara
// con un relleno cuyo ancho es un porcentaje. La usan "De dónde salen los puntos" y, después, las
// recompensas más canjeadas.
interface HorizontalBarProps {
  /** 0 a 100. */
  percent: number;
  color: string;
  /** Alto en px (10 para la barra principal, 6 para las secundarias). */
  height?: number;
}

export function HorizontalBar({ percent, color, height = 8 }: HorizontalBarProps) {
  const width = percent > 0 ? Math.max(2, Math.min(100, Math.round(percent))) : 0;
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-full bg-[#fdebe2]"
      style={{ height }}
    >
      <div
        className="h-full min-w-0.5 rounded-full"
        style={{ width: `${width}%`, backgroundColor: color, minWidth: width > 0 ? 2 : 0 }}
      />
    </div>
  );
}
