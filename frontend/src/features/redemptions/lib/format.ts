// Etiquetas y textos de los canjes (contrato §2.3 y §3.12).
import { isoToDisplayDateTime } from '@/shared/lib/dates'
import type { RedemptionStatus } from '../types/redemption'

/** Estado del canje: el valor coincide con la API y la etiqueta es la que se muestra (§2.3). */
export const REDEMPTION_STATUSES: Record<RedemptionStatus, string> = {
  CONFIRMED: 'Confirmado',
  USED: 'Utilizado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Vencido',
}

/** Los cinco estados, en el orden del filtro "Estado" del Administrador. */
export const REDEMPTION_STATUS_VALUES = Object.keys(REDEMPTION_STATUSES) as RedemptionStatus[]

const MINUTE = 60_000

/** Milisegundos que le faltan al canje para vencer (negativo si ya venció). */
export const msUntil = (expiresAt: string, now: number) => new Date(expiresAt).getTime() - now

/**
 * "Vence en {n} min" (CA-45.3). Se redondea hacia arriba y el último minuto dice
 * "Vence en menos de 1 min" (decisión tomada a pedido de Deni, 02/11).
 */
export function expiresInText(expiresAt: string, now: number) {
  const ms = msUntil(expiresAt, now)
  if (ms < MINUTE) return 'Vence en menos de 1 min'
  return `Vence en ${Math.ceil(ms / MINUTE)} min`
}

/**
 * Cuenta regresiva de "¡Canje confirmado!" (§3.7.2): "Vence en 14:59"; "Vence en menos de 1 min"
 * en el último minuto. En 0 dice "El canje venció", como el prototipo (decisión tomada a pedido de
 * Deni, 02/11).
 */
export function countdownText(expiresAt: string, now: number) {
  const ms = msUntil(expiresAt, now)
  if (ms <= 0) return 'El canje venció'
  if (ms < MINUTE) return 'Vence en menos de 1 min'
  const seconds = Math.floor(ms / 1000)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `Vence en ${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`
}

/** En rojo cuando faltan 2 minutos o menos (§3.7.2). */
export const isExpiringSoon = (expiresAt: string, now: number) =>
  msUntil(expiresAt, now) <= 2 * MINUTE

/** ISO UTC → { date: 'dd/mm/aaaa', time: 'hh:mm' } en hora de Argentina. */
export function splitDateTime(value: string) {
  const [date, time] = isoToDisplayDateTime(value).split(' ')
  return { date, time }
}

/** Lo que escribe el empleado, como lo normaliza el backend (§3.6.1): mayúsculas, sin espacios ni guiones. */
export const normalizeRedemptionCode = (value: string) => value.replace(/[\s-]/g, '').toUpperCase()
