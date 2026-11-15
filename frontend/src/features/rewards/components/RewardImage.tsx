// Foto de la recompensa o, sin foto (o si no carga), la imagen genérica del regalo (contrato S5
// §3.5.2). Cada pantalla pasa el tamaño y el fondo de la genérica, como en el prototipo.
import { useState } from 'react'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { cn } from '@/shared/lib/utils'

type RewardImageProps = {
  photoUrl: string | null
  /** Tamaño y bordes, iguales para la foto y la genérica */
  className: string
  /** Fondo y color de la imagen genérica */
  genericClassName?: string
  iconClassName?: string
  /** Texto debajo del regalo (el modal dice "Imagen genérica") */
  genericLabel?: string
}

export function RewardImage({
  photoUrl,
  className,
  genericClassName = 'bg-[#fbe6d4] text-[#a8532a]',
  iconClassName = 'size-5',
  genericLabel,
}: RewardImageProps) {
  // La URL que no cargó; si cambia la foto, se vuelve a intentar
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  if (photoUrl && photoUrl !== failedUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={cn('block shrink-0 object-cover', className)}
        onError={() => setFailedUrl(photoUrl)}
      />
    )
  }

  return (
    <div
      aria-hidden={genericLabel ? undefined : true}
      className={cn('grid shrink-0 place-items-center', className, genericClassName)}
    >
      {genericLabel ? (
        <span className="text-center text-[11px]">
          <Icon d={ICONS.gift} className={cn('mx-auto mb-0.5 block', iconClassName)} />
          {genericLabel}
        </span>
      ) : (
        <Icon d={ICONS.gift} className={iconClassName} />
      )}
    </div>
  )
}
