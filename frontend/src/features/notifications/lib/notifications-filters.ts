// Estado de los filtros del historial de notificaciones (US-14, contrato S5 §3.8.4)
import type { DocumentType } from '@/domain/documents'
import type { NotificationStatus, NotificationType } from '../types/notifications'

export type NotificationsFiltersState = {
  type: NotificationType | ''
  status: NotificationStatus | ''
  documentType: DocumentType
  documentNumber: string
  fromDate: string
  toDate: string
}

export const EMPTY_NOTIFICATIONS_FILTERS: NotificationsFiltersState = {
  type: '',
  status: '',
  documentType: 'DNI',
  documentNumber: '',
  fromDate: '',
  toDate: '',
}

