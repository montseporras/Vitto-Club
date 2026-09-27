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
