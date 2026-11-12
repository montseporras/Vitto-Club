// Utilidades de los calendarios de Administración (DateRangePicker y DatePicker).
// Los meses son 'YYYY-MM' y los días 'YYYY-MM-DD'.

export const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export function monthTitle(value: string) {
  const [year, month] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

export function shiftMonth(value: string, amount: number) {
  const [year, month] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + amount, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Casilleros de un mes, empezando en lunes: null para los vacíos y 'YYYY-MM-DD' para cada día. */
export function monthDays(visibleMonth: string): (string | null)[] {
  const [year, month] = visibleMonth.split('-').map(Number)
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: count }, (_, index) =>
      `${visibleMonth}-${String(index + 1).padStart(2, '0')}`,
    ),
  ]
}

/** 'YYYY-MM-DD' → 'DD/MM/AAAA' */
export function isoToDmy(iso: string) {
  return iso.split('-').reverse().join('/')
}
