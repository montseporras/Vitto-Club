// Este archivo es el gráfico de columnas de Estadísticas, hecho solo con CSS (sin librería, S5-27):
// la cantidad arriba de cada columna y, en el eje, la etiqueta y el monto. La columna más fuerte va
// en el color fuerte y las demás en el suave. Todos los valores quedan escritos y, al pasar el
// mouse por una columna, se ve el detalle (contrato S5 §3.9.7).
import { formatInteger } from '@/shared/lib/numbers';
import { formatStatisticsMoney } from '../lib/format';

export interface ChartColumn {
  key: string;
  /** Etiqueta del eje (corta: "Lun", "08:00–12:00"). */
  label: string;
  /** Nombre completo para el texto al pasar el mouse ("Lunes"). */
  fullLabel: string;
  count: number;
  amount: number;
}

interface ColumnsChartProps {
  title: string;
  subtitle: string;
  /** "Día más fuerte" o "Franja más fuerte". */
  strongestCaption: string;
  /** Nombre de la columna más fuerte; null si no hubo ningún consumo. */
  strongestName: string | null;
  columns: ChartColumn[];
  /** Posición de la más fuerte, o -1 si no hay ninguna. */
  strongestIndex: number;
  strongColor: string;
  softColor: string;
  /** Ancho máximo de cada columna, en px. */
  maxBarWidth: number;
}

export function ColumnsChart({
  title,
  subtitle,
  strongestCaption,
  strongestName,
  columns,
  strongestIndex,
  strongColor,
  softColor,
  maxBarWidth,
}: ColumnsChartProps) {
  const max = Math.max(...columns.map((column) => column.count), 1);

  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-[#f6e4da] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(126,62,32,0.05)] [@media(max-height:820px)]:py-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg leading-tight font-bold text-[#2b1a10]">{title}</h3>
          <p className="mt-0.5 text-xs text-[#7a6e63] [@media(max-height:820px)]:text-[11px]">
            {subtitle}
          </p>
        </div>
        <span className="text-xs whitespace-nowrap text-[#5c5249]">
          {strongestCaption}: <strong className="text-[#2b1a10]">{strongestName ?? '—'}</strong>
        </span>
      </div>

      <div
        className="mt-3 flex min-h-[150px] flex-1 items-end gap-2.5 border-b border-[#efe1d6] pt-[18px] [@media(max-height:820px)]:min-h-[118px] bg-[repeating-linear-gradient(to_top,transparent_0,transparent_49px,#f8efe9_49px,#f8efe9_50px)]"
        role="list"
        aria-label={title}
      >
        {columns.map((column, index) => {
          const strong = index === strongestIndex;
          const height = Math.max(2, Math.round((column.count / max) * 100));
          return (
            <div
              key={column.key}
              role="listitem"
              aria-label={`${column.fullLabel}: ${formatInteger(column.count)} consumos · ${formatStatisticsMoney(column.amount)}`}
              title={`${column.fullLabel}: ${formatInteger(column.count)} consumos · ${formatStatisticsMoney(column.amount)}`}
              className="group flex h-full min-w-0 flex-1 cursor-default flex-col items-center justify-end gap-1"
            >
              <span
                className="text-xs font-bold tracking-[-0.01em] tabular-nums"
                style={{ color: strong ? strongColor : '#2b1a10' }}
              >
                {formatInteger(column.count)}
              </span>
              <div
                className="w-full rounded-t-[3px] group-hover:brightness-95"
                style={{
                  height: `${column.count > 0 ? height : 0}%`,
                  maxWidth: maxBarWidth,
                  minHeight: 2,
                  backgroundColor: strong ? strongColor : softColor,
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-1.5 flex gap-2.5" aria-hidden="true">
        {columns.map((column, index) => {
          const strong = index === strongestIndex;
          return (
            <div
              key={column.key}
              className="min-w-0 flex-1 text-center text-xs leading-[1.3] whitespace-nowrap"
              style={{ color: strong ? strongColor : '#5c5249', fontWeight: strong ? 700 : 400 }}
            >
              {column.label}
              <small
                className="block text-[10px] font-semibold tracking-[-0.02em] tabular-nums"
                style={{ color: strong ? strongColor : '#7a6e63' }}
              >
                {formatStatisticsMoney(column.amount)}
              </small>
            </div>
          );
        })}
      </div>
    </section>
  );
}
