// Este archivo hace las llamadas al backend de Notificaciones (US-14, contrato S5 §3.6 y §3.8).
// Lo usan los hooks de notifications.queries.ts; las pantallas no lo llaman directo.
import { http } from '@/shared/api/http'
import type {
  MessagesConfiguration,
  NotificationsPage,
  NotificationsQuery,
  ResendResult,
  UpdateMessagesConfigurationDto,
} from '../types/notifications'

const MESSAGES_URL = '/configuracion/mensajes'
const NOTIFICATIONS_URL = '/notificaciones'

// §3.8.4: paginado de a 20
export const NOTIFICATIONS_PAGE_SIZE = 20

// §3.6.1
export async function getMessagesConfiguration(): Promise<MessagesConfiguration> {
  const { data } = await http.get<MessagesConfiguration>(MESSAGES_URL)
  return data
}

// §3.6.2: devuelve lo mismo que el GET, ya guardado
export async function updateMessagesConfiguration(
  body: UpdateMessagesConfigurationDto,
): Promise<MessagesConfiguration> {
  const { data } = await http.put<MessagesConfiguration>(MESSAGES_URL, body)
  return data
}

// §3.8.4. Solo viajan los filtros con valor; el documento solo si tiene número
export async function getNotifications(query: NotificationsQuery): Promise<NotificationsPage> {
  const documentNumber = query.documentNumber?.trim()
  const { data } = await http.get<NotificationsPage>(NOTIFICATIONS_URL, {
    params: {
      type: query.type || undefined,
      status: query.status || undefined,
      ...(documentNumber ? { documentType: query.documentType, documentNumber } : {}),
      fromDate: query.fromDate || undefined,
      toDate: query.toDate || undefined,
      page: query.page,
      limit: NOTIFICATIONS_PAGE_SIZE,
    },
  })
  return data
}

// §3.8.5: sin body; 202 { id, queued }
export async function resendNotification(id: number): Promise<ResendResult> {
  const { data } = await http.post<ResendResult>(`${NOTIFICATIONS_URL}/${id}/reenviar`)
  return data
}
