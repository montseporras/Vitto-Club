// Hooks de Notificaciones (US-14): conectan la pantalla con notifications.api.ts y manejan carga,
// error y caché.
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NotificationsQuery, UpdateMessagesConfigurationDto } from '../types/notifications'
import {
  getMessagesConfiguration,
  getNotifications,
  resendNotification,
  updateMessagesConfiguration,
} from './notifications.api'
import { notificationsKeys } from './notifications.keys'

// Mensajes automáticos y puntos de cumpleaños (§3.6.1)
export const useMessagesConfiguration = () =>
  useQuery({
    queryKey: notificationsKeys.messages(),
    queryFn: getMessagesConfiguration,
  })

// Guarda (§3.6.2). La respuesta ya es la configuración guardada: va directo a la caché.
export const useUpdateMessagesConfiguration = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateMessagesConfigurationDto) => updateMessagesConfiguration(body),
    onSuccess: (saved) => {
      qc.setQueryData(notificationsKeys.messages(), saved)
    },
  })
}

// Historial (§3.8.4). Mientras carga otra página o filtro, se sigue viendo la anterior.
export const useNotifications = (query: NotificationsQuery) =>
  useQuery({
    queryKey: notificationsKeys.historyPage(query),
    queryFn: () => getNotifications(query),
    placeholderData: keepPreviousData,
  })

// Reenviar (§3.8.5). Hay un registro nuevo y el original pasa a "Ya se reenvió": se recarga el historial.
export const useResendNotification = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => resendNotification(id),
    onSettled: () => qc.invalidateQueries({ queryKey: notificationsKeys.history() }),
  })
}
