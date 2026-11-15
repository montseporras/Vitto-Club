// Borrador de la pestaña Mensajes (US-14): los puntos como los escribe el Administrador y los tres
// mensajes automáticos. "Guardar cambios" lo manda entero en el PUT (contrato S5 §3.6.2).
import type { AutomaticMessage, MessagesConfiguration } from '../types/notifications'
import { AUTOMATIC_TYPES } from './notification-labels'

export type MessagesDraft = { points: string; messages: AutomaticMessage[] }

// Lo guardado, en el orden de la pantalla (Vencimiento de puntos, Cumpleaños, Misiones)
export const draftFrom = (saved: MessagesConfiguration): MessagesDraft => ({
  points: String(saved.birthdayBonusPoints),
  messages: AUTOMATIC_TYPES.map((type) => {
    const message = saved.messages.find((entry) => entry.type === type)
    return message ?? { type, active: false, subject: '', body: '' }
  }),
})

export const sameDraft = (a: MessagesDraft, b: MessagesDraft) =>
  a.points.trim() === b.points.trim() && JSON.stringify(a.messages) === JSON.stringify(b.messages)
