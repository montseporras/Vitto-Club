// Este archivo son los selectores Mes y Año de Estadísticas (contrato S5 §3.9.7).
// Mes: enero a diciembre, con los meses futuros del año actual deshabilitados.
// Año: el actual y el anterior.
import { Select } from '@/shared/components/ui/Select';
import { MONTH_NAMES, yearOptions, type YearMonth } from '../lib/period';

interface PeriodSelectorsProps {
  selected: YearMonth;
  today: YearMonth;
  onChange: (next: YearMonth) => void;
}

const labelClass =
  'flex flex-col gap-0.5 text-[11px] font-bold tracking-[0.04em] text-[#7e3e20] uppercase';
// Los selectores de esta pantalla miden 36 px de alto (prototipo).
const selectClass = 'h-9 min-h-0 py-0 text-sm font-normal normal-case tracking-normal';

export function PeriodSelectors({ selected, today, onChange }: PeriodSelectorsProps) {
  const isFuture = (month: number) => selected.year === today.year && month > today.month;

  return (
    <div className="flex items-end gap-2.5">
      <label className={labelClass}>
        Mes
        <Select
          className={selectClass}
          value={String(selected.month)}
          onChange={(event) => onChange({ year: selected.year, month: Number(event.target.value) })}
          options={MONTH_NAMES.map((name, index) => ({
            value: String(index + 1),
            label: name,
            disabled: isFuture(index + 1),
          }))}
        />
      </label>
      <label className={labelClass}>
        Año
        <Select
          className={selectClass}
          value={String(selected.year)}
          onChange={(event) => onChange({ year: Number(event.target.value), month: selected.month })}
          options={yearOptions(today).map((year) => ({
            value: String(year),
            label: String(year),
          }))}
        />
      </label>
    </div>
  );
}
