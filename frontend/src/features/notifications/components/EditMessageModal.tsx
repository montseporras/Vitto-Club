// Modal "Mensaje: {tipo}" (US-14, CA-14.2): Asunto, Mensaje con contador, las variables que acepta el
// tipo y la vista previa con datos de ejemplo. Como en el prototipo, "Guardar" solo deja el cambio
// pendiente: se guarda de verdad con "Guardar cambios" de la pantalla.
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { FormField } from '@/shared/components/forms/FormField'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Modal } from '@/shared/components/ui/Modal'
import { Textarea } from '@/shared/components/ui/Textarea'
import { useModalEscape } from '@/shared/hooks/useModalEscape'
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard'
import { exampleValues, replaceVariables, variablesHint } from '../lib/message-variables'
import { NOTIFICATION_TYPES } from '../lib/notification-labels'
import {
  MAX_BODY_LENGTH,
  MAX_SUBJECT_LENGTH,
  messageSchema,
  type MessageFormValues,
} from '../schemas/message.schema'
import type { AutomaticMessage } from '../types/notifications'
import { EmailPreview } from './EmailPreview'

type EditMessageModalProps = {
  message: AutomaticMessage
  // Para el {puntos} de la vista previa de Cumpleaños
  birthdayBonusPoints: number
  onAccept: (values: MessageFormValues) => void
  onClose: () => void
}

export function EditMessageModal({ message, birthdayBonusPoints, onAccept, onClose }: EditMessageModalProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema(message.type)),
    defaultValues: { subject: message.subject, body: message.body },
    // Valida mientras se escribe: el error aparece en el campo, no todos al final
    mode: 'onChange',
  })
  // Cerrar con cambios sin guardar (cruz, Cancelar o Escape) pregunta antes
  const { guard, dialog: unsavedDialog } = useUnsavedChangesGuard(isDirty)
  const requestClose = guard(onClose)
  useModalEscape(requestClose)


  const subject = useWatch({ control, name: 'subject' }) ?? ''
  const body = useWatch({ control, name: 'body' }) ?? ''
  const examples = exampleValues(message.type, birthdayBonusPoints)

  return (
    <Modal title={`Mensaje: ${NOTIFICATION_TYPES[message.type]}`} onClose={requestClose} className="max-w-[640px]">
      <form onSubmit={handleSubmit(onAccept)} noValidate className="space-y-3">
        <FormField id="message-subject" label="Asunto" error={errors.subject?.message} hideRequiredMark>
          <Input
            id="message-subject"
            maxLength={MAX_SUBJECT_LENGTH}
            aria-invalid={errors.subject ? true : undefined}
            aria-describedby={errors.subject ? 'message-subject-error' : undefined}
            {...register('subject')}
          />
        </FormField>

        <FormField id="message-body" label="Mensaje" error={errors.body?.message} hideRequiredMark>
          <Textarea
            id="message-body"
            rows={4}
            maxLength={MAX_BODY_LENGTH}
            aria-invalid={errors.body ? true : undefined}
            aria-describedby={errors.body ? 'message-body-error' : 'message-body-count'}
            {...register('body')}
          />
        </FormField>
        <p id="message-body-count" className="-mt-2 text-right text-[11px] text-[#7a6e63]">
          {body.length}/{MAX_BODY_LENGTH}
        </p>

        <p className="text-[13px] text-[#5c5249]">{variablesHint(message.type)}</p>

        <EmailPreview
          subject={replaceVariables(subject, examples)}
          body={replaceVariables(body, examples)}
          note="La vista previa usa datos de ejemplo."
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={requestClose}>
            Cancelar
          </Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
      {unsavedDialog}
    </Modal>
  )
}

