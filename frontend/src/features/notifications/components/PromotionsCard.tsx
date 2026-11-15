// Tarjeta "Promociones" de la pestaña Mensajes (US-15, CA-15.1 y CA-15.5, contrato S5 §3.7.5): el texto,
// "+ Enviar promoción" y, si hay, la lista "Envíos programados" con "Cancelar envío". El error al
// cancelar va en un aviso rojo arriba de la lista, como en el resto de la app (decisión de Melisa).
import { useState } from 'react'
import { LEVELS } from '@/domain/levels'
import { toApiError } from '@/shared/api/ApiError'
import { useToast } from '@/shared/components/feedback/useToast'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardTitle } from '@/shared/components/ui/Card'
import { isoToDisplayDateTime } from '@/shared/lib/dates'
import { formatInteger } from '@/shared/lib/numbers'
import { useCancelPromotionSend, useScheduledPromotions } from '../api/promotions.queries'
import type { PromotionSend } from '../types/promotions'
import { SendPromotionModal } from './SendPromotionModal'

function cancelErrorMessages(error: unknown): string[] {
  const apiError = toApiError(error)
  if (apiError.messages.length > 0) return apiError.messages
  return ['No se pudo cancelar el envío. Intentá nuevamente.']
}

// "Sale el {dd/mm/aaaa hh:mm} · Todos los clientes · {n} clientes" (§3.7.5)
const scheduledLine = (send: PromotionSend) => {
  const at = send.scheduledAt ? `Sale el ${isoToDisplayDateTime(send.scheduledAt)}` : ''
  const to = send.level ? `Nivel ${LEVELS[send.level]}` : 'Todos los clientes'
  return `${at} · ${to} · ${formatInteger(send.recipients)} clientes`
}

export function PromotionsCard() {
  const toast = useToast()
  const [sending, setSending] = useState(false)
  const scheduled = useScheduledPromotions()
  const cancel = useCancelPromotionSend()
  // Error del último "Cancelar envío"; se borra con la próxima acción de la tarjeta
  const [cancelError, setCancelError] = useState<string[] | null>(null)

  const cancelSend = (send: PromotionSend) => {
    setCancelError(null)
    cancel.mutate(send.id, {
      onSuccess: () => toast('Se canceló el envío programado.'),
      onError: (error) => setCancelError(cancelErrorMessages(error)),
    })
  }

  const openModal = () => {
    setCancelError(null)
    setSending(true)
  }

  const sends = scheduled.data ?? []

  return (
    <Card compact>
      {/* El botón centrado en vertical respecto del título y el texto (pedido de Melisa) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex-[1_1_320px]">
          <CardTitle>Promociones</CardTitle>
          <p className="mt-1 text-[#5c5249]">
            Escribí el asunto y el mensaje de cada promoción desde cero, elegí a quién va y si sale ahora o en una
            fecha y hora. No se guarda: solo quedan los envíos en el historial.
          </p>
        </div>
        <Button type="button" onClick={openModal}>
          + Enviar promoción
        </Button>
      </div>

      {cancelError && (
        <Alert variant="error" className="mt-4">
          <AlertMessages messages={cancelError} />
        </Alert>
      )}

      {scheduled.isError && (
        <Alert variant="error" className="mt-4">
          <p>
            No se pudieron cargar los envíos programados.{' '}
            <button
              type="button"
              onClick={() => void scheduled.refetch()}
              className="cursor-pointer font-semibold underline underline-offset-2"
            >
              Reintentar
            </button>
          </p>
        </Alert>
      )}

      {sends.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-bold tracking-wide text-[#7e3e20] uppercase">Envíos programados</p>
          <ul className="overflow-hidden rounded-[14px] border border-[#f6d0b1] bg-white">
            {sends.map((send) => (
              <li
                key={send.id}
                className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#fbe6d4] px-4 py-2.5 last:border-b-0"
              >
                <div className="min-w-[200px] flex-1">
                  <strong className="text-sm">{send.subject}</strong>
                  <p className="text-[13px] text-[#7a6e63]">{scheduledLine(send)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-[34px] px-3 text-[13px]"
                  disabled={cancel.isPending && cancel.variables === send.id}
                  onClick={() => cancelSend(send)}
                >
                  Cancelar envío
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sending && <SendPromotionModal onClose={() => setSending(false)} />}
    </Card>
  )
}
