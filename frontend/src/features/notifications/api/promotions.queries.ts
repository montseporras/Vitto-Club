// Hooks del envío de promociones (US-15): conectan la tarjeta y el modal con promotions.api.ts.
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Level } from '@/domain/levels'
import type { SendPromotionDto } from '../types/promotions'
import { notificationsKeys } from './notifications.keys'
import {
  cancelPromotionSend,
  getPromotionRecipients,
  getScheduledPromotions,
  sendPromotion,
} from './promotions.api'

// "Envíos programados" (§3.7.4)
export const useScheduledPromotions = () =>
  useQuery({
    queryKey: notificationsKeys.scheduledPromotions(),
    queryFn: getScheduledPromotions,
  })

// "Le llega a {n} clientes activos." (§3.7.2). Mientras carga otro destinatario se sigue viendo el
// último número (decisión de Melisa).
export const usePromotionRecipients = (level: Level | null, enabled = true) =>
  useQuery({
    queryKey: notificationsKeys.promotionRecipients(level),
    queryFn: () => getPromotionRecipients(level),
    placeholderData: keepPreviousData,
    enabled,
  })

// Enviar ahora o programar (§3.7.3). Cambian los programados y, al salir, el historial.
export const useSendPromotion = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: SendPromotionDto) => sendPromotion(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationsKeys.scheduledPromotions() })
      void qc.invalidateQueries({ queryKey: notificationsKeys.history() })
    },
  })
}

// Cancelar un programado (§3.7.4). Con éxito o con 409/404 se vuelve a pedir la lista.
export const useCancelPromotionSend = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => cancelPromotionSend(id),
    onSettled: () => qc.invalidateQueries({ queryKey: notificationsKeys.scheduledPromotions() }),
  })
}
