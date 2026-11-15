// Llamadas al backend del envío de promociones (US-15, contrato S5 §3.7). Las usan los hooks de
// promotions.queries.ts; las pantallas no las llaman directo.
import type { Level } from '@/domain/levels'
import { http } from '@/shared/api/http'
import type {
  PromotionRecipients,
  PromotionSend,
  SendPromotionDto,
  SendPromotionResult,
} from '../types/promotions'

const PROMOTIONS_URL = '/promociones'

// §3.7.2: sin level = todos los clientes activos
export async function getPromotionRecipients(level: Level | null): Promise<PromotionRecipients> {
  const { data } = await http.get<PromotionRecipients>(`${PROMOTIONS_URL}/destinatarios`, {
    params: level ? { level } : undefined,
  })
  return data
}

// §3.7.3: el status de la respuesta dice si salió ahora (202) o quedó programado (201)
export async function sendPromotion(body: SendPromotionDto): Promise<SendPromotionResult> {
  const response = await http.post<PromotionSend | { id: number; queued: number }>(`${PROMOTIONS_URL}/envios`, body)
  if (response.status === 202) {
    const { id, queued } = response.data as { id: number; queued: number }
    return { kind: 'now', id, queued }
  }
  return { kind: 'scheduled', send: response.data as PromotionSend }
}

// §3.7.4: los SCHEDULED, por scheduledAt ascendente
export async function getScheduledPromotions(): Promise<PromotionSend[]> {
  const { data } = await http.get<PromotionSend[]>(`${PROMOTIONS_URL}/envios`)
  return data
}

// §3.7.4
export async function cancelPromotionSend(id: number): Promise<PromotionSend> {
  const { data } = await http.patch<PromotionSend>(`${PROMOTIONS_URL}/envios/${id}/cancelar`)
  return data
}
