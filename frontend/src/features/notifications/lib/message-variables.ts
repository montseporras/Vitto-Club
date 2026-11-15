// Variables de los mensajes (contrato S5 §3.6.1) y los datos de ejemplo de la vista previa
// (prototipo, ConfigNotificaciones.html y datos-sprint5.js). La pantalla solo reemplaza para la vista
// previa: el envío real lo hace el backend.
import { addDaysToIso, todayIsoInTimeZone } from '@/shared/lib/dates'
import type { NotificationType } from '../types/notifications'

// §3.6.1: variables que acepta cada tipo
export const MESSAGE_VARIABLES: Record<NotificationType, string[]> = {
  POINTS_EXPIRING: ['{nombre}', '{puntos}', '{fecha}'],
  BIRTHDAY: ['{nombre}', '{puntos}'],
  MISSION: ['{nombre}', '{mision}'],
  PROMOTION: ['{nombre}'],
}

// Como en el prototipo: una variable es una palabra en minúsculas entre llaves
const VARIABLE_PATTERN = /\{[a-z]+\}/g

// La primera variable que no corresponde al tipo, o null. Mira el asunto y el mensaje.
export function firstInvalidVariable(type: NotificationType, ...texts: string[]): string | null {
  const allowed = MESSAGE_VARIABLES[type]
  for (const text of texts) {
    const invalid = (text.match(VARIABLE_PATTERN) ?? []).find((variable) => !allowed.includes(variable))
    if (invalid) return invalid
  }
  return null
}

// §3.6.1: mensaje del contrato para una variable que no corresponde
export const invalidVariableMessage = (variable: string) =>
  `La variable ${variable} no se puede usar en este mensaje.`

// "Podés usar: {nombre}, {puntos} y {fecha}."
export function variablesHint(type: NotificationType): string {
  const vars = MESSAGE_VARIABLES[type]
  const list = vars.length > 1 ? `${vars.slice(0, -1).join(', ')} y ${vars[vars.length - 1]}` : vars[0]
  return `Podés usar: ${list}.`
}

const toDisplayDate = (iso: string) => {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

// Datos de ejemplo de la vista previa (prototipo). En Cumpleaños, {puntos} son los puntos cargados.
export function exampleValues(type: NotificationType, birthdayBonusPoints: number): Record<string, string> {
  const today = todayIsoInTimeZone('America/Argentina/Buenos_Aires')
  return {
    '{nombre}': 'Marcos',
    '{puntos}': type === 'BIRTHDAY' ? String(birthdayBonusPoints) : '200',
    '{fecha}': toDisplayDate(addDaysToIso(today, 7)),
    '{mision}': 'Vení 3 veces este mes',
  }
}

export function replaceVariables(text: string, values: Record<string, string>): string {
  return text.replace(VARIABLE_PATTERN, (variable) => values[variable] ?? variable)
}
