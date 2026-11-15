// Puerta de entrada del feature notifications: lo que pueden usar los demás módulos (el layout del
// Administrador y los mocks) sin entrar a sus carpetas internas.
export { NotificationsSettingsPage } from './pages/NotificationsSettingsPage'
export { MESSAGE_VARIABLES, firstInvalidVariable } from './lib/message-variables'
export { NOTIFICATION_TYPES } from './lib/notification-labels'
export type {
  AutomaticMessage,
  AutomaticNotificationType,
  MessagesConfiguration,
  NotificationChannel,
  NotificationRecord,
  NotificationsPage,
  NotificationStatus,
  NotificationType,
  ResendResult,
  UpdateMessagesConfigurationDto,
} from './types/notifications'
export type {
  PromotionRecipients,
  PromotionSend,
  PromotionSendStatus,
  SendPromotionDto,
} from './types/promotions'
