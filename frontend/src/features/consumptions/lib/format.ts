// Formatos de pantalla del historial: fecha en hora de Argentina y montos con $.
const dateTime = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// ISO UTC → 'dd/mm/aaaa hh:mm' (hora de Argentina).
export const formatDateTime = (iso: string) =>
  dateTime.format(new Date(iso)).replace(',', '');

// 50000 → '$ 50.000'; con centavos: '$ 12.500,50'.
export const formatAmount = (amount: number) =>
  `$ ${amount.toLocaleString('es-AR', {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

const shortDateFormat = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

// ISO UTC → '12 nov 2026' (hora de Argentina), para la vista del Cliente.
export const formatShortDate = (iso: string) => {
  const parts = shortDateFormat.formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('day')} ${get('month').replace('.', '')} ${get('year')}`;
};
