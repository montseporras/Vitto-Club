export const BIRTH_DATE_INVALID_MESSAGE = 'Esa fecha no existe';
export const BIRTH_DATE_FUTURE_MESSAGE = 'La fecha no puede ser futura';

export const MIN_BIRTH_YEAR = 1900;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export type BirthDateCheck = { date: Date } | { message: string };

// Fecha de nacimiento de Mi perfil (contrato §3.10.4): YYYY-MM-DD, que exista en el calendario,
// año >= 1900 y no futura. Devuelve la fecha (a las 00:00 UTC, como se guarda) o el mensaje del contrato.
export function checkBirthDate(value: string, now: Date): BirthDateCheck {
  const match = DATE_PATTERN.exec(value);
  if (!match) return { message: BIRTH_DATE_INVALID_MESSAGE };

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  // Date.UTC corrige las fechas imposibles (31/02 pasa a marzo): si cambió algo, no existía
  const exists = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!exists || year < MIN_BIRTH_YEAR) return { message: BIRTH_DATE_INVALID_MESSAGE };
  if (date > now) return { message: BIRTH_DATE_FUTURE_MESSAGE };

  return { date };
}
