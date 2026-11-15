// Vista previa del correo (US-14, contrato S5 §3.6.2 y §3.8.3): el logo fijo de Vitto Club (S5-35),
// el asunto, el mensaje y el pie fijo. La reusa la tarjeta de Promociones (US-15), con los textos
// grises de cuando todavía está vacío.
import logoWhite from '@/assets/logo-vitto-iso-white.png'
import { cn } from '@/shared/lib/utils'

type EmailPreviewProps = {
  subject: string
  body: string
  // Lo que se ve, en gris, mientras el asunto o el mensaje están vacíos (US-15)
  subjectPlaceholder?: string
  bodyPlaceholder?: string
  // Nota debajo de la vista previa
  note: string
}

export function EmailPreview({ subject, body, subjectPlaceholder, bodyPlaceholder, note }: EmailPreviewProps) {
  const showSubject = subject || subjectPlaceholder || ''
  const showBody = body || bodyPlaceholder || ''

  return (
    <div>
      <p className="mb-1.5 text-xs font-bold tracking-wide text-[#7e3e20] uppercase">Vista previa</p>
      <div className="overflow-hidden rounded-[14px] border border-[#f6d0b1] bg-white">
        <div className="flex items-center gap-2.5 bg-[#a9532b] px-4 py-3">
          <img src={logoWhite} alt="" className="size-8 object-contain" />
          <span className="font-heading font-bold text-white">Vitto Club</span>
        </div>
        <div className="px-4 py-3.5">
          <p className={cn('font-heading text-base font-bold', subject ? 'text-[#2b1a10]' : 'text-[#9c8f82]')}>
            {showSubject}
          </p>
          <p className={cn('mt-2 text-sm whitespace-pre-wrap', body ? 'text-[#2b1a10]' : 'text-[#9c8f82]')}>
            {showBody}
          </p>
          <p className="mt-3.5 border-t border-[#fbe6d4] pt-2.5 text-[11px] text-[#7a6e63]">
            Recibís este correo porque sos parte de Vitto Club.
          </p>
        </div>
      </div>
      <p className="mt-1.5 text-[11px] text-[#7a6e63]">{note}</p>
    </div>
  )
}
