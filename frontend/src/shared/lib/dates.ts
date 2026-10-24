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

/** ISO UTC → 'DD/MM/AAAA HH:mm' en hora de Argentina. */
export function isoToArgentinaDateTime(value: string) {
  const parts = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value))
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? ''
  return `${part('day')}/${part('month')}/${part('year')} ${part('hour')}:${part('minute')}`
}

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

// Argentina es UTC-3 todo el año (sin horario de verano)
const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires'

/** Instante ISO UTC de la API → 'DD/MM/AAAA' en hora de Argentina. */
export function formatArgentinaDate(value: string) {
  const parts = new Intl.DateTimeFormat('es-AR', {
    timeZone: ARGENTINA_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(new Date(value))
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? ''
  return `${part('day')}/${part('month')}/${part('year')}`
}

const ARGENTINA_DATE_TIME = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Cordoba',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** ISO UTC de la API → 'dd/mm/aaaa hh:mm' en hora de Argentina. */
export function isoToDisplayDateTime(value: string) {
  const parts = Object.fromEntries(
    ARGENTINA_DATE_TIME.formatToParts(new Date(value)).map((p) => [p.type, p.value]),
  )
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`
}

const ARGENTINA_DATE = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Cordoba',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/** ISO UTC de la API → 'dd/mm/aaaa' en hora de Argentina (ej. fecha de alta). */
export function isoToDisplayDateOnly(value: string) {
  const parts = Object.fromEntries(
    ARGENTINA_DATE.formatToParts(new Date(value)).map((p) => [p.type, p.value]),
  )
  return `${parts.day}/${parts.month}/${parts.year}`
}
