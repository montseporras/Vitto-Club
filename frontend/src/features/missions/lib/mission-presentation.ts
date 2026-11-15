import { DOCUMENT_TYPES } from '@/domain/documents'
import { formatInteger, formatMoney } from '@/shared/lib/numbers'
import type { Mission, MissionObjectiveType, MissionPhase } from '../types/mission'

const DAY_NAMES = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos']
const SHORT_DAYS = ['', 'L', 'M', 'X', 'J', 'V', 'S', 'D']

export function monthKeyInArgentina(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}`
}

export function addMonths(month: string, count: number) {
  const [year, value] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, value - 1 + count, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(month: string, capitalize = false) {
  const date = new Date(`${month}-01T00:00:00.000Z`)
  const name = new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    timeZone: 'UTC',
  }).format(date)
  return `${capitalize ? name.charAt(0).toUpperCase() + name.slice(1) : name} ${month.slice(0, 4)}`
}

export function objectiveLabel(objectiveType: MissionObjectiveType, target: number) {
  if (objectiveType === 'CONSUMPTION_AMOUNT') {
    return `${formatMoney(target).replace('$', '$ ')} en consumos`
  }
  return `${formatInteger(target)} ${target === 1 ? 'consumo' : 'consumos'}`
}

export function conditionLabel(mission: Pick<Mission, 'daysOfWeek' | 'timeFrom' | 'timeTo'>) {
  const parts: string[] = []
  if (mission.daysOfWeek?.length) {
    const days = mission.daysOfWeek
      .slice()
      .sort((a, b) => a - b)
      .map((day) => DAY_NAMES[day])
    const dayText =
      days.length <= 1
        ? days.join('')
        : `${days.slice(0, -1).join(', ')} y ${days[days.length - 1]}`
    parts.push(`los ${dayText}`)
  }
  if (mission.timeFrom && mission.timeTo) {
    parts.push(`de ${mission.timeFrom} a ${mission.timeTo}`)
  }
  return parts.join(' ')
}

export function missionPhaseLabel(phase: MissionPhase) {
  if (phase === 'RUNNING') return 'En curso'
  if (phase === 'UPCOMING') return 'Próxima'
  return 'Finalizada'
}

export function missionPhaseVariant(phase: MissionPhase) {
  if (phase === 'RUNNING') return 'success'
  if (phase === 'UPCOMING') return 'neutral'
  return 'danger'
}

export function missionValidityLabel(mission: Pick<Mission, 'startMonth' | 'endMonth'>) {
  const start = monthLabel(mission.startMonth, true)
  if (!mission.endMonth) return `Desde ${monthLabel(mission.startMonth)}`
  if (mission.startMonth === mission.endMonth) return start
  return `${start} – ${monthLabel(mission.endMonth, true)}`
}

export function completedMissionStatusLabel(status: 'COMPLETED' | 'CLAIMED') {
  return status === 'COMPLETED' ? 'Completada' : 'Reclamada'
}

export function documentLabel(documentType: keyof typeof DOCUMENT_TYPES, documentNumber: string) {
  const number =
    documentType === 'DNI' && /^\d+$/.test(documentNumber)
      ? Number(documentNumber).toLocaleString('es-AR')
      : documentNumber
  return `${DOCUMENT_TYPES[documentType].label} ${number}`
}

export const MISSION_WEEK_DAYS = SHORT_DAYS
