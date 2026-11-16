// Modal "Enviar promoción" (US-15, CA-15.2 a CA-15.4, contrato S5 §3.7.3 y §3.7.5). Arranca vacío:
// Asunto, Mensaje con contador, "Cuándo se envía" (Ahora / Programar con fecha y hora), Destinatarios
// con "Le llega a {n} clientes activos." y la vista previa con el logo fijo. Los errores del backend
// van en el aviso rojo de arriba del modal, como en el prototipo.
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { LEVELS } from '@/domain/levels'
import { toApiError } from '@/shared/api/ApiError'
import { useToast } from '@/shared/components/feedback/useToast'
import { FormField } from '@/shared/components/forms/FormField'
import { SegmentedRadio } from '@/shared/components/forms/SegmentedRadio'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Modal } from '@/shared/components/ui/Modal'
import { Select } from '@/shared/components/ui/Select'
import { Textarea } from '@/shared/components/ui/Textarea'
import { useModalEscape } from '@/shared/hooks/useModalEscape'
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard'
import { argentinaDateTimeInputValue, argentinaDateTimeToIso, isoToDisplayDateTime } from '@/shared/lib/dates'
import { formatInteger } from '@/shared/lib/numbers'
import { usePromotionRecipients, useSendPromotion } from '../api/promotions.queries'
import { exampleValues, replaceVariables, variablesHint } from '../lib/message-variables'
import { MAX_BODY_LENGTH, MAX_SUBJECT_LENGTH } from '../schemas/message.schema'
import { sendPromotionSchema, type SendPromotionFormValues } from '../schemas/send-promotion.schema'
import { EmailPreview } from './EmailPreview'

const WHEN_OPTIONS = [
  { value: 'NOW', label: 'Ahora' },
  { value: 'SCHEDULED', label: 'Programar' },
]

const AUDIENCE_OPTIONS = [
  { value: 'ALL', label: 'Todos los clientes activos' },
  { value: 'BRONZE', label: `Clientes de nivel ${LEVELS.BRONZE}` },
  { value: 'SILVER', label: `Clientes de nivel ${LEVELS.SILVER}` },
  { value: 'GOLD', label: `Clientes de nivel ${LEVELS.GOLD}` },
]

const EMPTY_FORM: SendPromotionFormValues = { subject: '', body: '', when: 'NOW', scheduledAt: '', audience: 'ALL' }

// "Le llega a 1 cliente activo." / "Le llega a 120 clientes activos." (prototipo)
const recipientsText = (count: number) =>
  `Le llega a ${formatInteger(count)} ${count === 1 ? 'cliente activo' : 'clientes activos'}.`

function sendErrorMessages(error: unknown): string[] {
  const apiError = toApiError(error)
  if (apiError.status === 403) return ['Solo un Administrador puede enviar promociones.']
  if (apiError.messages.length > 0) return apiError.messages
  return ['No se pudo enviar la promoción. Intentá nuevamente.']
}

type SendPromotionModalProps = { onClose: () => void }

export function SendPromotionModal({ onClose }: SendPromotionModalProps) {
  const toast = useToast()
  const send = useSendPromotion()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = useForm<SendPromotionFormValues>({
    resolver: zodResolver(sendPromotionSchema),
    defaultValues: EMPTY_FORM,
    // Valida mientras se escribe: el error aparece en el campo, no todos al final
    mode: 'onChange',
  })
  // Cerrar con cambios sin guardar (cruz, Cancelar o Escape) pregunta antes
  const { guard, dialog: unsavedDialog } = useUnsavedChangesGuard(isDirty)
  const requestClose = guard(onClose)
  useModalEscape(requestClose)


  const subject = useWatch({ control, name: 'subject' }) ?? ''
  const body = useWatch({ control, name: 'body' }) ?? ''
  const when = useWatch({ control, name: 'when' })
  const audience = useWatch({ control, name: 'audience' })
  const level = audience === 'ALL' ? null : audience
  const recipients = usePromotionRecipients(level)
  // Como el prototipo: la vista previa de una promoción solo reemplaza {nombre}
  const examples = { '{nombre}': exampleValues('PROMOTION', 0)['{nombre}'] }

  const onSubmit = handleSubmit((form) => {
    send.mutate(
      {
        subject: form.subject,
        body: form.body,
        level: form.audience === 'ALL' ? null : form.audience,
        scheduledAt: form.when === 'SCHEDULED' ? argentinaDateTimeToIso(form.scheduledAt) : null,
      },
      {
        onSuccess: (result) => {
          if (result.kind === 'now') {
            toast(`Se está enviando la promoción a ${formatInteger(result.queued)} clientes.`)
          } else {
            const at = result.send.scheduledAt ? isoToDisplayDateTime(result.send.scheduledAt) : ''
            toast(`Promoción programada para el ${at} (${formatInteger(result.send.recipients)} clientes).`)
          }
          onClose()
        },
      },
    )
  })

  return (
    <Modal title="Enviar promoción" onClose={requestClose} className="max-w-[640px]">
      <form onSubmit={onSubmit} noValidate className="space-y-3">
        {send.isError && (
          <Alert variant="error">
            <AlertMessages messages={sendErrorMessages(send.error)} />
          </Alert>
        )}

        <FormField id="promotion-subject" label="Asunto" error={errors.subject?.message} hideRequiredMark>
          <Input
            id="promotion-subject"
            maxLength={MAX_SUBJECT_LENGTH}
            placeholder="Ej: ¡Este viernes, pizza libre!"
            aria-invalid={errors.subject ? true : undefined}
            aria-describedby={errors.subject ? 'promotion-subject-error' : undefined}
            {...register('subject')}
          />
        </FormField>

        <FormField id="promotion-body" label="Mensaje" error={errors.body?.message} hideRequiredMark>
          <Textarea
            id="promotion-body"
            rows={4}
            maxLength={MAX_BODY_LENGTH}
            placeholder="Ej: Hola {nombre}: todos los viernes de 20:00 a 23:30, pizza libre para toda la mesa."
            aria-invalid={errors.body ? true : undefined}
            aria-describedby={errors.body ? 'promotion-body-error' : 'promotion-body-count'}
            {...register('body')}
          />
        </FormField>
        <p id="promotion-body-count" className="-mt-2 text-right text-[11px] text-[#7a6e63]">
          {body.length}/{MAX_BODY_LENGTH}
        </p>

        <p className="text-[13px] text-[#5c5249]">{variablesHint('PROMOTION')}</p>

        <div className="grid gap-x-5 gap-y-3.5 sm:grid-cols-2">
          <div>
            <SegmentedRadio legend="Cuándo se envía" options={WHEN_OPTIONS} field={register('when')} />
            {when === 'SCHEDULED' && (
              <div className="mt-2">
                <Input
                  type="datetime-local"
                  aria-label="Fecha y hora del envío"
                  min={argentinaDateTimeInputValue(1)}
                  aria-invalid={errors.scheduledAt ? true : undefined}
                  aria-describedby={errors.scheduledAt ? 'promotion-scheduled-error' : undefined}
                  {...register('scheduledAt')}
                />
                {errors.scheduledAt && (
                  <p id="promotion-scheduled-error" className="mt-0.5 text-xs text-[#a8532a]">
                    {errors.scheduledAt.message}
                  </p>
                )}
              </div>
            )}
          </div>

          <FormField id="promotion-audience" label="Destinatarios" hideRequiredMark>
            <Select
              id="promotion-audience"
              options={AUDIENCE_OPTIONS}
              aria-describedby="promotion-audience-count"
              {...register('audience')}
            />
            {/* Sin conteo todavía (o si falló), no se muestra la línea (decisión de Melisa) */}
            {recipients.data && !recipients.isError && (
              <p id="promotion-audience-count" className="mt-1 text-xs text-[#7a6e63]">
                {recipientsText(recipients.data.count)}
              </p>
            )}
          </FormField>
        </div>

        <EmailPreview
          subject={replaceVariables(subject, examples)}
          body={replaceVariables(body, examples)}
          subjectPlaceholder="Asunto de la promoción"
          bodyPlaceholder="Mensaje de la promoción."
          note="La promoción no se guarda: solo quedan los envíos en el historial."
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={requestClose}>
            Cancelar
          </Button>
          <Button loading={send.isPending} type="submit" disabled={send.isPending}>
            {when === 'SCHEDULED' ? 'Programar envío' : 'Enviar ahora'}
          </Button>
        </div>
      </form>
      {unsavedDialog}
    </Modal>
  )
}
