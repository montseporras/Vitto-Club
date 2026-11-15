// Nombres con los que se guarda en caché lo de Notificaciones. Lo usan los hooks de
// notifications.queries.ts para leer y refrescar esos datos.
import type { NotificationsQuery } from '../types/notifications'

export const notificationsKeys = {
  all: ['notifications'] as const,
  messages: () => [...notificationsKeys.all, 'messages'] as const,
  history: () => [...notificationsKeys.all, 'history'] as const,
  historyPage: (query: NotificationsQuery) => [...notificationsKeys.history(), query] as const,
}
