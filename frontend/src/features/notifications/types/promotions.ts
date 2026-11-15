// Tipos del envío de promociones (US-15), idénticos al contrato S5 (§2.6.1 y §3.7).
import type { Level } from '@/domain/levels'

// §2.6.1
export type PromotionSendStatus = 'SCHEDULED' | 'SENT' | 'CANCELLED'

// §3.7.1
export type PromotionSend = {
  id: number
  subject: string
  body: string
  // null = todos los clientes activos
  level: Level | null
  // ISO UTC; null = se envió en el momento
  scheduledAt: string | null
  status: PromotionSendStatus
  // En los SCHEDULED, la cuenta al momento de la consulta; al salir, la real
  recipients: number
  sentAt: string | null
  createdBy: { id: number; firstName: string; lastName: string }
  createdAt: string
}

// §3.7.2
export type PromotionRecipients = { count: number }

// §3.7.3: scheduledAt null = ahora
export type SendPromotionDto = {
  subject: string
  body: string
  level: Level | null
  scheduledAt: string | null
}

// §3.7.3: "ahora" → 202 { id, queued }; programado → 201 PromotionSend
export type SendPromotionResult =
  | { kind: 'now'; id: number; queued: number }
  | { kind: 'scheduled'; send: PromotionSend }
