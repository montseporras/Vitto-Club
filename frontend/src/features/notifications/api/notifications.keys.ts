// Nombres con los que se guarda en caché lo de Notificaciones. Lo usan los hooks de
// notifications.queries.ts para leer y refrescar esos datos.
import type { Level } from '@/domain/levels'
import type { NotificationsQuery } from '../types/notifications'

export const notificationsKeys = {
  all: ['notifications'] as const,
  messages: () => [...notificationsKeys.all, 'messages'] as const,
  history: () => [...notificationsKeys.all, 'history'] as const,
  historyPage: (query: NotificationsQuery) => [...notificationsKeys.history(), query] as const,
  // US-15: envío de promociones
  scheduledPromotions: () => [...notificationsKeys.all, 'scheduled-promotions'] as const,
  promotionRecipients: (level: Level | null) =>
    [...notificationsKeys.all, 'promotion-recipients', level ?? 'ALL'] as const,
}
