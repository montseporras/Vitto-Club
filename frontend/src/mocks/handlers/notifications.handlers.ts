// Simula el backend de Notificaciones (US-14, contrato S5 §3.6 y §3.8) para probar la pantalla sin
// levantar la API: GET/PUT /configuracion/mensajes con sus validaciones, GET /notificaciones con sus
// filtros y el paginado de a 20, y POST /notificaciones/:id/reenviar con cada error. Todo es solo del
// Administrador (403 para Cajero y Cliente). El historial es de ejemplo propio, no el del prototipo.
import { http, HttpResponse } from 'msw'
import { API_URL } from '@/shared/api/http'
import {
  firstInvalidVariable,
  NOTIFICATION_TYPES,
  type AutomaticMessage,
  type AutomaticNotificationType,
  type MessagesConfiguration,
  type NotificationRecord,
  type NotificationStatus,
  type NotificationType,
} from '@/features/notifications'
import { accountFromRequest } from './auth.handlers'
import { customers, errorResponse } from './cashier.handlers'

const MESSAGES_URL = `${API_URL}/configuracion/mensajes`
const NOTIFICATIONS_URL = `${API_URL}/notificaciones`
const AUTOMATIC: AutomaticNotificationType[] = ['POINTS_EXPIRING', 'BIRTHDAY', 'MISSION']
const PAGE_SIZE = 20

// §3.6.1: los textos por defecto que carga BASE-5
let configuration: MessagesConfiguration = {
  birthdayBonusPoints: 100,
  messages: [
    {
      type: 'POINTS_EXPIRING',
      active: true,
      subject: 'Tus puntos están por vencer',
      body: 'Hola {nombre}: tenés {puntos} pts que vencen el {fecha}. ¡Usalos antes de que caduquen!',
    },
    {
      type: 'BIRTHDAY',
      active: true,
      subject: '¡Feliz cumpleaños!',
      body: '¡Feliz cumpleaños, {nombre}! Te regalamos {puntos} pts para celebrar con nosotros.',
    },
    {
      type: 'MISSION',
      active: true,
      subject: '¡Completaste una misión!',
      body: '¡Bien, {nombre}! Completaste la misión {mision}. Entrá a Vitto Club para ver tu recompensa.',
    },
  ],
}

// Solo el Administrador (§4). Devuelve el error o null.
function checkAdmin(request: Request, path: string) {
  const account = accountFromRequest(request)
  if (!account) return errorResponse(401, 'Token inválido o vencido.', path, 'UNAUTHENTICATED')
  if (account.role !== 'ADMIN') {
    return errorResponse(403, 'No tenés permiso para realizar esta acción.', path, 'FORBIDDEN')
  }
  return null
}

// --- Historial de ejemplo -------------------------------------------------------------------

const HOUR = 60 * 60 * 1000
const SUBJECTS: Record<NotificationType, string> = {
  POINTS_EXPIRING: 'Tus puntos están por vencer',
  BIRTHDAY: '¡Feliz cumpleaños!',
  PROMOTION: '¡Este viernes, pizza libre!',
  MISSION: '¡Completaste una misión!',
}
const TYPES_CYCLE: NotificationType[] = ['POINTS_EXPIRING', 'PROMOTION', 'MISSION', 'BIRTHDAY', 'PROMOTION']
const STATUSES_CYCLE: NotificationStatus[] = ['SENT', 'SENT', 'SKIPPED', 'SENT', 'FAILED', 'SENT']

let nextId = 1
const history: NotificationRecord[] = []

function record(
  type: NotificationType,
  status: NotificationStatus,
  customerIndex: number,
  hoursAgo: number,
  extra: Partial<NotificationRecord> = {},
): NotificationRecord {
  const customer = customers[customerIndex % customers.length]
  return {
    id: nextId++,
    createdAt: new Date(Date.now() - hoursAgo * HOUR).toISOString(),
    type,
    channel: 'EMAIL',
    recipient: customer.email,
    customer: {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      documentType: customer.documentType,
      documentNumber: customer.documentNumber,
    },
    subject: SUBJECTS[type],
    status,
    error: status === 'FAILED' ? 'El proveedor rechazó el correo: dirección inexistente.' : null,
    resentFromId: null,
    resent: false,
    ...extra,
  }
}

// 32 notificaciones de los últimos días: alcanza para dos páginas
for (let index = 0; index < 32; index++) {
  history.push(record(TYPES_CYCLE[index % TYPES_CYCLE.length], STATUSES_CYCLE[index % STATUSES_CYCLE.length], index, 5 + index * 9))
}
// Una que falló y ya se reenvió, con su reenvío
const failedAndResent = record('MISSION', 'FAILED', 2, 30, { resent: true })
history.push(failedAndResent)
history.push(record('MISSION', 'SENT', 2, 28, { resentFromId: failedAndResent.id }))
// Una de cumpleaños que falló, para probar "Las notificaciones de Cumpleaños están desactivadas."
history.push(record('BIRTHDAY', 'FAILED', 3, 2))

// US-15: los correos PROMOTION de un envío quedan en el historial, uno por cliente. En la app salen en
// segundo plano (§8.1 #3); acá quedan enviados al instante.
export function recordPromotionEmails(subject: string, customerIds: number[]) {
  for (const customerId of customerIds) {
    const index = customers.findIndex((customer) => customer.id === customerId)
    if (index >= 0) history.push(record('PROMOTION', 'SENT', index, 0, { subject }))
  }
}

// Sin puntos, espacios ni guiones, en mayúsculas (igual que en Canjes)
const normalize = (value: string) => value.replace(/[^0-9A-Za-z]/g, '').toUpperCase()

// 'YYYY-MM-DD' en hora de Argentina
const argentinaDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })

// --- Validación del PUT (§3.6.2) --------------------------------------------------------------

function validateMessages(body: unknown): string[] {
  const errors: string[] = []
  const data = (body ?? {}) as { birthdayBonusPoints?: unknown; messages?: unknown }
  const points = data.birthdayBonusPoints
  if (typeof points !== 'number' || !Number.isInteger(points) || points < 0 || points > 10_000) {
    errors.push('Ingresá puntos enteros de 0 a 10.000.')
  }
  if (!Array.isArray(data.messages)) return [...errors, 'messages must be an array']

  for (const raw of data.messages as { type?: string; subject?: unknown; body?: unknown }[]) {
    if (raw.type === 'PROMOTION') {
      errors.push('Las promociones no tienen mensaje automático.')
      continue
    }
    const subject = typeof raw.subject === 'string' ? raw.subject.trim() : ''
    const text = typeof raw.body === 'string' ? raw.body.trim() : ''
    if (!subject) errors.push('El asunto es obligatorio.')
    else if (subject.length > 120) errors.push('El asunto no puede superar los 120 caracteres.')
    if (!text) errors.push('El mensaje es obligatorio.')
    else if (text.length > 1000) errors.push('El mensaje no puede superar los 1.000 caracteres.')
    if (raw.type && AUTOMATIC.includes(raw.type as AutomaticNotificationType)) {
      const invalid = firstInvalidVariable(raw.type as AutomaticNotificationType, subject, text)
      if (invalid) errors.push(`La variable ${invalid} no se puede usar en este mensaje.`)
    }
  }
  return errors
}

export const notificationsHandlers = [
  // §3.6.1
  http.get(MESSAGES_URL, ({ request }) => {
    const denied = checkAdmin(request, '/api/configuracion/mensajes')
    if (denied) return denied
    return HttpResponse.json(configuration)
  }),

  // §3.6.2: guarda los tres mensajes y los puntos; responde lo mismo que el GET
  http.put(MESSAGES_URL, async ({ request }) => {
    const path = '/api/configuracion/mensajes'
    const denied = checkAdmin(request, path)
    if (denied) return denied
    const body = (await request.json()) as MessagesConfiguration
    const errors = validateMessages(body)
    if (errors.length > 0) return errorResponse(400, errors, path)

    configuration = {
      birthdayBonusPoints: body.birthdayBonusPoints,
      messages: AUTOMATIC.map((type) => {
        const sent = body.messages.find((message) => message.type === type)
        const previous = configuration.messages.find((message) => message.type === type)
        return sent
          ? { type, active: sent.active, subject: sent.subject.trim(), body: sent.body.trim() }
          : (previous as AutomaticMessage)
      }),
    }
    return HttpResponse.json(configuration)
  }),

  // §3.8.4: filtros, de a 20, por fecha descendente
  http.get(NOTIFICATIONS_URL, ({ request }) => {
    const denied = checkAdmin(request, '/api/notificaciones')
    if (denied) return denied
    const params = new URL(request.url).searchParams
    const type = params.get('type')
    const status = params.get('status')
    const documentType = params.get('documentType') ?? 'DNI'
    const documentNumber = normalize(params.get('documentNumber') ?? '')
    const fromDate = params.get('fromDate')
    const toDate = params.get('toDate')
    const page = Math.max(1, Number(params.get('page') ?? 1))
    const limit = Number(params.get('limit') ?? PAGE_SIZE)

    if (fromDate && toDate && fromDate > toDate) {
      return errorResponse(400, 'fromDate no puede ser posterior a toDate', '/api/notificaciones')
    }

    const filtered = history
      .filter((row) => !type || row.type === type)
      .filter((row) => !status || row.status === status)
      .filter(
        (row) =>
          !documentNumber ||
          (row.customer.documentType === documentType && row.customer.documentNumber.includes(documentNumber)),
      )
      .filter((row) => !fromDate || argentinaDate(row.createdAt) >= fromDate)
      .filter((row) => !toDate || argentinaDate(row.createdAt) <= toDate)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    return HttpResponse.json({
      items: filtered.slice((page - 1) * limit, page * limit),
      total: filtered.length,
      page,
      limit,
    })
  }),

  // §3.8.5: reenviar un correo que falló, una sola vez
  http.post(`${NOTIFICATIONS_URL}/:id/reenviar`, ({ request, params }) => {
    const path = `/api/notificaciones/${String(params.id)}/reenviar`
    const denied = checkAdmin(request, path)
    if (denied) return denied

    const original = history.find((row) => row.id === Number(params.id))
    if (!original) return errorResponse(404, 'No existe la notificación.', path)
    if (original.status !== 'FAILED') {
      return errorResponse(409, 'Solo se pueden reenviar los correos que fallaron.', path, 'NOTIFICATION_NOT_RESENDABLE')
    }
    if (original.resent) {
      return errorResponse(409, 'Este correo ya se reenvió.', path, 'NOTIFICATION_NOT_RESENDABLE')
    }
    const automatic = configuration.messages.find((message) => message.type === original.type)
    if (automatic && !automatic.active) {
      return errorResponse(
        409,
        `Las notificaciones de ${NOTIFICATION_TYPES[original.type]} están desactivadas.`,
        path,
        'NOTIFICATION_DISABLED',
      )
    }

    // Un registro nuevo; el original queda como estaba, salvo que ahora figura como reenviado.
    // En la app el correo sale en segundo plano (§8.1 #3); acá queda enviado al instante.
    original.resent = true
    const customer = customers.find((entry) => entry.id === original.customer.id)
    const resent: NotificationRecord = {
      ...original,
      id: nextId++,
      createdAt: new Date().toISOString(),
      recipient: customer?.email ?? original.recipient,
      status: 'SENT',
      error: null,
      resentFromId: original.id,
      resent: false,
    }
    history.push(resent)
    return HttpResponse.json({ id: resent.id, queued: 1 }, { status: 202 })
  }),
]
