// Pestaña "Mensajes" de Configuración → Notificaciones (US-14, contrato S5 §3.6.2), de arriba abajo:
// "Puntos de regalo por cumpleaños", "Mensajes automáticos" (con Descartar y "Guardar cambios") y,
// después, la tarjeta "Promociones" de US-15 (la recibe en `children`).
// Los cambios se juntan en un borrador: "Editar mensaje", el interruptor y los puntos solo lo cambian;
// "Guardar cambios" manda todo junto en un PUT. El borrador lo guarda la página, así no se pierde al
// cambiar a Historial y volver (decisión de Melisa).
import { useState, type ReactNode } from 'react'
import { toApiError } from '@/shared/api/ApiError'
import { FormField } from '@/shared/components/forms/FormField'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardTitle } from '@/shared/components/ui/Card'
import { Input } from '@/shared/components/ui/Input'
import { useUpdateMessagesConfiguration } from '../api/notifications.queries'
import { draftFrom, sameDraft, type MessagesDraft } from '../lib/messages-draft'
import { AUTOMATIC_WHEN, NOTIFICATION_TYPES } from '../lib/notification-labels'
import { birthdayPointsSchema } from '../schemas/birthday-points.schema'
import type { MessageFormValues } from '../schemas/message.schema'
import type { AutomaticMessage, AutomaticNotificationType, MessagesConfiguration } from '../types/notifications'
import { ActiveSwitch } from './ActiveSwitch'
import { EditMessageModal } from './EditMessageModal'

// Los errores del PUT van en un aviso rojo arriba de las tarjetas, como en el resto de la
// Configuración (decisión de Melisa), con los mensajes del backend
function saveErrorMessages(error: unknown): string[] {
  const apiError = toApiError(error)
  if (apiError.status === 403) return ['Solo un Administrador puede cambiar esta configuración.']
  if (apiError.messages.length > 0) return apiError.messages
  return ['No se pudieron guardar las notificaciones. Intentá nuevamente.']
}

type MessagesTabProps = {
  saved: MessagesConfiguration
  // null: sin cambios todavía (se muestra lo guardado)
  draft: MessagesDraft | null
  onDraftChange: (draft: MessagesDraft | null) => void
  // La tarjeta "Promociones" (US-15)
  children?: ReactNode
}

export function MessagesTab({ saved, draft, onDraftChange, children }: MessagesTabProps) {
  const update = useUpdateMessagesConfiguration()
  const [editing, setEditing] = useState<AutomaticNotificationType | null>(null)
  const [pointsError, setPointsError] = useState<string | null>(null)
  const [savedOk, setSavedOk] = useState(false)
  // Se borra con el próximo cambio, al descartar o al volver a guardar
  const [saveError, setSaveError] = useState<string[] | null>(null)

  const current = draft ?? draftFrom(saved)
  const pending = !sameDraft(current, draftFrom(saved))
  const parsedPoints = birthdayPointsSchema.safeParse(current.points)
  const editingMessage = current.messages.find((message) => message.type === editing)

  const change = (next: MessagesDraft) => {
    setSavedOk(false)
    setSaveError(null)
    onDraftChange(next)
  }

  const setMessage = (type: AutomaticNotificationType, patch: Partial<AutomaticMessage>) =>
    change({
      ...current,
      messages: current.messages.map((message) => (message.type === type ? { ...message, ...patch } : message)),
    })

  const acceptMessage = (values: MessageFormValues) => {
    if (editing) setMessage(editing, values)
    setEditing(null)
  }

  const save = () => {
    setSaveError(null)
    if (!parsedPoints.success) {
      setPointsError(parsedPoints.error.issues[0]?.message ?? null)
      return
    }
    update.mutate(
      { birthdayBonusPoints: parsedPoints.data, messages: current.messages },
      {
        onSuccess: () => {
          setPointsError(null)
          onDraftChange(null)
          setSavedOk(true)
        },
        onError: (error) => setSaveError(saveErrorMessages(error)),
      },
    )
  }

  const discard = () => {
    setPointsError(null)
    setSaveError(null)
    setSavedOk(false)
    onDraftChange(null)
  }

  return (
    <div className="space-y-6">
      {savedOk && (
        <Alert variant="success">Notificaciones guardadas. Se aplican a los próximos envíos.</Alert>
      )}

      {saveError && (
        <Alert variant="error">
          <AlertMessages messages={saveError} />
        </Alert>
      )}

      <Card compact>
        <CardTitle>Puntos de regalo por cumpleaños</CardTitle>
        <p className="mt-1 mb-5 text-[#5c5249]">
          Puntos que recibe el cliente el día de su cumpleaños, junto con el saludo. Con 0 solo se manda el saludo.
        </p>
        <FormField id="birthday-points" label="Puntos" error={pointsError ?? undefined} hideRequiredMark>
          <Input
            id="birthday-points"
            inputMode="numeric"
            autoComplete="off"
            className="w-40"
            value={current.points}
            aria-invalid={pointsError ? true : undefined}
            aria-describedby={pointsError ? 'birthday-points-error' : undefined}
            onChange={(event) => {
              setPointsError(null)
              change({ ...current, points: event.target.value })
            }}
          />
        </FormField>
        <p className="mt-3 text-xs text-[#7a6e63]">
          Se acreditan una vez por año, solo si el mensaje de cumpleaños está activo. No cuentan para el nivel.
        </p>
      </Card>

      <Card compact>
        <CardTitle>Mensajes automáticos</CardTitle>
        <p className="mt-1 mb-5 text-[#5c5249]">
          Se envían por correo. Si un tipo está desactivado, no se envía y queda en el historial como "No enviada".
        </p>
        <ul className="overflow-hidden rounded-[14px] border border-[#f6d0b1] bg-white">
          {current.messages.map((message) => (
            <li
              key={message.type}
              className="flex flex-wrap items-center justify-between gap-3 even:bg-[#fdf3e9] px-[18px] py-3.5 last:border-b-0"
            >
              <div className="min-w-[220px] flex-1">
                <strong className="text-[15px]">{NOTIFICATION_TYPES[message.type]}</strong>
                <p className="text-[13px] text-[#7a6e63]">{AUTOMATIC_WHEN[message.type]}</p>
                <p className="mt-0.5 text-[13px] text-[#2b1a10]">Asunto: {message.subject}</p>
              </div>
              <div className="flex items-center gap-3.5">
                <ActiveSwitch
                  checked={message.active}
                  label={`Activar ${NOTIFICATION_TYPES[message.type]}`}
                  onChange={(active) => setMessage(message.type, { active })}
                />
                <Button type="button" variant="secondary" onClick={() => setEditing(message.type)}>
                  Editar mensaje
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          {pending && <span className="mr-auto text-sm text-[#7e3e20]">Tenés cambios sin guardar.</span>}
          <Button type="button" variant="secondary" size="lg" disabled={!pending || update.isPending} onClick={discard}>
            Descartar
          </Button>
          <Button loading={update.isPending} type="button" size="lg" disabled={update.isPending} onClick={save}>
            {update.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </Card>

      {children}

      {editingMessage && (
        <EditMessageModal
          message={editingMessage}
          birthdayBonusPoints={parsedPoints.success ? parsedPoints.data : 0}
          onAccept={acceptMessage}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
