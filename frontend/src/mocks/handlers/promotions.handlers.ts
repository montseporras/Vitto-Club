// Simula el backend del envío de promociones (US-15, contrato S5 §3.7) para probar la pantalla sin
// levantar la API: destinatarios (todos los clientes activos o los de un nivel, con su nivel actual),
// enviar ahora (202) o programar (201) con sus validaciones, la lista de programados y cancelar con el
// 404 y el 409. Todo es solo del Administrador (403 para Cajero y Cliente). Los programados cuya hora
// ya pasó "salen" al pedir la lista, como si hubiera corrido el proceso de cada minuto.
import { http, HttpResponse } from 'msw'
import type { Level } from '@/domain/levels'
import { API_URL } from '@/shared/api/http'
import { firstInvalidVariable, type PromotionSend, type SendPromotionDto } from '@/features/notifications'
import { accountFromRequest } from './auth.handlers'
import { customers, errorResponse, levelOf, pointsByCustomer } from './cashier.handlers'
import { recordPromotionEmails } from './notifications.handlers'

const BASE = `${API_URL}/promociones`
const LEVEL_VALUES: Level[] = ['BRONZE', 'SILVER', 'GOLD']

let nextId = 1
const sends: PromotionSend[] = []

function checkAdmin(request: Request, path: string) {
  const account = accountFromRequest(request)
  if (!account) return { error: errorResponse(401, 'Token inválido o vencido.', path, 'UNAUTHENTICATED') }
  if (account.role !== 'ADMIN') {
    return { error: errorResponse(403, 'No tenés permiso para realizar esta acción.', path, 'FORBIDDEN') }
  }
  return { account }
}

// Clientes activos, todos o los de un nivel (su nivel actual, con lifetimePoints)
function recipientIds(level: Level | null): number[] {
  return customers
    .filter((customer) => customer.active)
    .filter((customer) => !level || levelOf(pointsByCustomer[customer.id]?.lifetimePoints ?? 0).current === level)
    .map((customer) => customer.id)
}

// El proceso de programados (§3.7.4): los SCHEDULED con scheduledAt <= ahora pasan a SENT
function sendDueScheduled() {
  const now = Date.now()
  for (const send of sends) {
    if (send.status === 'SCHEDULED' && send.scheduledAt && new Date(send.scheduledAt).getTime() <= now) {
      const ids = recipientIds(send.level)
      send.status = 'SENT'
      send.sentAt = new Date().toISOString()
      send.recipients = ids.length
      recordPromotionEmails(send.subject, ids)
    }
  }
}

// §3.7.3, una lista de mensajes del contrato (o vacía)
function validate(body: Partial<SendPromotionDto>): string[] {
  const errors: string[] = []
  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  const text = typeof body.body === 'string' ? body.body.trim() : ''
  if (!subject) errors.push('El asunto es obligatorio.')
  else if (subject.length > 120) errors.push('El asunto no puede superar los 120 caracteres.')
  if (!text) errors.push('El mensaje es obligatorio.')
  else if (text.length > 1000) errors.push('El mensaje no puede superar los 1.000 caracteres.')
  const invalid = firstInvalidVariable('PROMOTION', subject, text)
  if (invalid) errors.push(`La variable ${invalid} no se puede usar en este mensaje.`)
  if (body.level !== null && body.level !== undefined && !LEVEL_VALUES.includes(body.level)) {
    errors.push('level must be one of the following values: BRONZE, SILVER, GOLD')
  }
  if (body.scheduledAt !== null && body.scheduledAt !== undefined) {
    const at = new Date(body.scheduledAt).getTime()
    if (Number.isNaN(at) || at <= Date.now()) errors.push('La fecha y hora tienen que ser posteriores a ahora.')
  }
  return errors
}

export const promotionsHandlers = [
  // §3.7.2
  http.get(`${BASE}/destinatarios`, ({ request }) => {
    const path = '/api/promociones/destinatarios'
    const { error } = checkAdmin(request, path)
    if (error) return error
    const level = new URL(request.url).searchParams.get('level')
    if (level && !LEVEL_VALUES.includes(level as Level)) {
      return errorResponse(400, ['level must be one of the following values: BRONZE, SILVER, GOLD'], path)
    }
    return HttpResponse.json({ count: recipientIds((level as Level) || null).length })
  }),

  // §3.7.3: ahora → 202 { id, queued }; programado → 201 PromotionSend
  http.post(`${BASE}/envios`, async ({ request }) => {
    const path = '/api/promociones/envios'
    const { error, account } = checkAdmin(request, path)
    if (error) return error
    const body = (await request.json()) as Partial<SendPromotionDto>
    const errors = validate(body)
    if (errors.length > 0) return errorResponse(400, errors, path)

    const level = body.level ?? null
    const ids = recipientIds(level)
    const scheduledAt = body.scheduledAt ?? null
    const send: PromotionSend = {
      id: nextId++,
      subject: (body.subject ?? '').trim(),
      body: (body.body ?? '').trim(),
      level,
      scheduledAt,
      status: scheduledAt ? 'SCHEDULED' : 'SENT',
      recipients: ids.length,
      sentAt: scheduledAt ? null : new Date().toISOString(),
      createdBy: {
        id: account?.employeeId ?? 0,
        firstName: account?.firstName ?? '',
        lastName: account?.lastName ?? '',
      },
      createdAt: new Date().toISOString(),
    }
    sends.push(send)

    if (!scheduledAt) {
      recordPromotionEmails(send.subject, ids)
      return HttpResponse.json({ id: send.id, queued: ids.length }, { status: 202 })
    }
    return HttpResponse.json(send, { status: 201 })
  }),

  // §3.7.4: los SCHEDULED por scheduledAt ascendente, con la cuenta de destinatarios de ahora
  http.get(`${BASE}/envios`, ({ request }) => {
    const { error } = checkAdmin(request, '/api/promociones/envios')
    if (error) return error
    sendDueScheduled()
    const scheduled = sends
      .filter((send) => send.status === 'SCHEDULED')
      .map((send) => ({ ...send, recipients: recipientIds(send.level).length }))
      .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''))
    return HttpResponse.json(scheduled)
  }),

  // §3.7.4: 404 inexistente; 409 si ya no está SCHEDULED
  http.patch(`${BASE}/envios/:id/cancelar`, ({ request, params }) => {
    const path = `/api/promociones/envios/${String(params.id)}/cancelar`
    const { error } = checkAdmin(request, path)
    if (error) return error
    sendDueScheduled()
    const send = sends.find((entry) => entry.id === Number(params.id))
    if (!send) return errorResponse(404, 'No existe el envío.', path)
    if (send.status !== 'SCHEDULED') {
      return errorResponse(409, 'El envío ya salió o se canceló.', path, 'PROMOTION_SEND_NOT_CANCELLABLE')
    }
    send.status = 'CANCELLED'
    return HttpResponse.json(send)
  }),
]
