/** Mientras se tipea: deja solo dígitos y agrega las barras → 'DD/MM/AAAA'. */
export function maskDate(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length > 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
  }
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return digits
}

/** 'YYYY-MM-DD' (formato de la API) → 'DD/MM/AAAA' (formato del campo). */
export const isoToDisplayDate = (value: string | null) =>
  value ? value.split('-').reverse().join('/') : ''

/**
 * 'DD/MM/AAAA' → 'YYYY-MM-DD', o null si la fecha no existe (31/02, mes 13…).
 * Se arma en UTC para que la zona horaria no corra el día.
 */
export function displayDateToIso(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return null
  const [, day, month, year] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  const exists =
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  return exists ? `${year}-${month}-${day}` : null
}

/** Hoy como 'YYYY-MM-DD' en la hora local (no en UTC). */
export function todayIso() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10)
}

/** Hoy como 'YYYY-MM-DD' en la zona horaria indicada. */
export function todayIsoInTimeZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

/** Suma días calendario a una fecha ISO sin depender de la zona local. */
export function addDaysToIso(value: string, days: number) {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

/** Muestra una fecha ISO en la zona horaria indicada como dd/mm/aaaa hh:mm. */
export function formatDateTimeInTimeZone(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value))
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.day}/${values.month}/${values.year} ${values.hour}:${values.minute}`
}

/** ISO UTC de la API → 'dd/mm/aaaa hh:mm' en hora de Argentina. */
export function isoToDisplayDateTime(value: string) {
  return formatDateTimeInTimeZone(value, 'America/Argentina/Cordoba')
}