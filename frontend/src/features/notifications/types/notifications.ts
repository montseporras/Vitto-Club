// Tipos de Notificaciones (US-14), idénticos al contrato S5 (§2.4 a §2.6, §3.6 y §3.8).
import type { DocumentType } from '@/domain/documents'

// §2.4. PROMOTION no es un mensaje automático: no tiene plantilla ni interruptor (S5-37)
export type NotificationType = 'POINTS_EXPIRING' | 'BIRTHDAY' | 'PROMOTION' | 'MISSION'
export type AutomaticNotificationType = Exclude<NotificationType, 'PROMOTION'>

// §2.5. El único canal (S5-10)
export type NotificationChannel = 'EMAIL'

// §2.6
export type NotificationStatus = 'SENT' | 'FAILED' | 'SKIPPED'

// §3.6.1: un mensaje automático
export type AutomaticMessage = {
  type: AutomaticNotificationType
  active: boolean
  subject: string
  body: string
}

// §3.6.1 y §3.6.2: GET y PUT /configuracion/mensajes (mismo cuerpo)
export type MessagesConfiguration = {
  birthdayBonusPoints: number
  messages: AutomaticMessage[]
}

export type UpdateMessagesConfigurationDto = MessagesConfiguration

// §3.8.4: una fila del historial (GET /notificaciones)
export type NotificationRecord = {
  id: number
  createdAt: string
  type: NotificationType
  channel: NotificationChannel
  recipient: string
  customer: {
    id: number
    firstName: string
    lastName: string
    documentType: DocumentType
    documentNumber: string
  }
  subject: string
  status: NotificationStatus
  error: string | null
  // Si este registro es el reenvío de otro, el id del que había fallado
  resentFromId: number | null
  // true si este registro FAILED ya se reenvió
  resent: boolean
}

export type NotificationsPage = {
  items: NotificationRecord[]
  total: number
  page: number
  limit: number
}

// §3.8.4: filtros del historial (paginado de a 20)
export type NotificationsQuery = {
  type?: NotificationType
  status?: NotificationStatus
  documentType?: DocumentType
  documentNumber?: string
  fromDate?: string
  toDate?: string
  page: number
}

// §3.8.5: POST /notificaciones/:id/reenviar → 202
export type ResendResult = { id: number; queued: number }
