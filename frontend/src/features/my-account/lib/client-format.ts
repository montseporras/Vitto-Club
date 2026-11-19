// Formatos de la vista del Cliente (rediseño V2).
import { ICONS } from '@/shared/components/ui/icons'
import { formatInteger, formatMoney } from '@/shared/lib/numbers'
import type { MyMission } from '../types/missions'

const SHORT_DATE = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** "12 nov 2026", en hora de Argentina. Acepta ISO UTC o 'YYYY-MM-DD'. */
export function shortDate(value: string) {
  // Una fecha sola ('YYYY-MM-DD') se toma al mediodía para que no cambie de día por la zona
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T15:00:00Z` : value)
  const parts = SHORT_DATE.formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('day')} ${get('month').replace('.', '')} ${get('year')}`
}

/** Ícono de una misión o recompensa según su nombre: taza, pizza, torta o el genérico. */
export function iconForName(name: string, fallback: string = ICONS.target) {
  const text = name.toLowerCase()
  if (/pizza/.test(text)) return ICONS.pizza
  if (/torta|postre|dulce|tarta/.test(text)) return ICONS.cake
  if (/caf[eé]|merienda|desayuno|t[eé]\b|medialuna|licuado|jugo/.test(text)) return ICONS.cup
  return fallback
}

/** "3/5" o "$ 12.000 / $ 30.000", según lo que mide la misión. */
export function missionProgressText(mission: MyMission) {
  return mission.objectiveType === 'CONSUMPTION_AMOUNT'
    ? `${formatMoney(mission.progress)} / ${formatMoney(mission.target)}`
    : `${formatInteger(mission.progress)}/${formatInteger(mission.target)}`
}
