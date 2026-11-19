// Selector de imagen con vista previa (US-34; lo reusa FOTO-PERFIL). Muestra la foto guardada, la
// elegida o lo que pase la pantalla cuando no hay ninguna (la imagen genérica), con "Elegir imagen"
// y "Quitar". Revisa el tipo y el tamaño antes de avisar (contrato S5 §3.5.1, como el prototipo); el
// backend vuelve a validar por el contenido. No sube nada: la pantalla decide cuándo guardar.
import { useEffect, useId, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { buttonVariants } from '@/styles/ui'
import { cn } from '@/shared/lib/utils'
import { Button } from '../ui/Button'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 2 * 1024 * 1024
// Contrato S5 §3.5.1 (el mismo texto que el 400 INVALID_IMAGE)
const INVALID_IMAGE_MESSAGE = 'Usá una imagen JPG, PNG o WebP de hasta 2 MB.'

type ImagePickerProps = {
  label: string
  /** Foto guardada; `null` = no tiene */
  photoUrl: string | null
  /** Lo que se ve sin foto (la imagen genérica) */
  placeholder: ReactNode
  /** Texto alternativo de la vista previa */
  previewAlt: string
  hint?: string
  /** Error que viene del backend (por ejemplo, el 400 INVALID_IMAGE) */
  error?: string | null
  disabled?: boolean
  previewClassName?: string
  chooseLabel?: string
  removeLabel?: string
  onSelect: (file: File) => void
  onRemove: () => void
}

type Selection = { kind: 'file'; url: string } | { kind: 'removed' } | null

export function ImagePicker({
  label,
  photoUrl,
  placeholder,
  previewAlt,
  hint,
  error,
  disabled,
  previewClassName = 'size-24 rounded-[14px]',
  chooseLabel = 'Elegir imagen',
  removeLabel = 'Quitar',
  onSelect,
  onRemove,
}: ImagePickerProps) {
  const id = useId()
  const [selection, setSelection] = useState<Selection>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  // Una imagen que el navegador no puede mostrar (por ejemplo, un PDF renombrado) deja la genérica
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  // La URL temporal de la imagen elegida se libera al reemplazarla y al cerrar
  const fileUrlRef = useRef<string | null>(null)
  useEffect(
    () => () => {
      if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current)
    },
    [],
  )

  const releaseFileUrl = () => {
    if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current)
    fileUrlRef.current = null
  }

  const previewUrl =
    selection?.kind === 'file' ? selection.url : selection?.kind === 'removed' ? null : photoUrl
  const shownError = localError ?? error ?? null
  const errorId = `${id}-error`
  const hintId = `${id}-hint`

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Se vacía para que elegir el mismo archivo otra vez vuelva a avisar
    event.target.value = ''
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type) || file.size > MAX_BYTES) {
      setLocalError(INVALID_IMAGE_MESSAGE)
      return
    }
    setLocalError(null)
    releaseFileUrl()
    const url = URL.createObjectURL(file)
    fileUrlRef.current = url
    setSelection({ kind: 'file', url })
    onSelect(file)
  }

  const remove = () => {
    releaseFileUrl()
    setLocalError(null)
    setSelection({ kind: 'removed' })
    onRemove()
  }

  return (
    <div className="grid gap-1.5">
      <p className="text-sm font-semibold text-[#3b2a20]">{label}</p>
      <div className="flex flex-wrap items-center gap-3.5">
        {previewUrl && previewUrl !== failedUrl ? (
          <img
            src={previewUrl}
            alt={previewAlt}
            className={cn('block shrink-0 object-cover', previewClassName)}
            onError={() => setFailedUrl(previewUrl)}
          />
        ) : (
          placeholder
        )}
        <div className="grid justify-items-start gap-1.5">
          <div className="flex items-center gap-2">
            <label
              htmlFor={`${id}-file`}
              className={cn(
                buttonVariants({ variant: 'secondary', size: 'sm' }),
                'cursor-pointer rounded-lg focus-within:ring-2 focus-within:ring-[#a8532a]/40',
                disabled && 'pointer-events-none opacity-50',
              )}
            >
              {chooseLabel}
              <input
                id={`${id}-file`}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                className="sr-only"
                disabled={disabled}
                aria-invalid={shownError ? true : undefined}
                aria-describedby={shownError ? errorId : hint ? hintId : undefined}
                onChange={onFileChange}
              />
            </label>
            {previewUrl && (
              <Button
                type="button"
                variant="ghost"
                disabled={disabled}
                size="sm"
                className="rounded-lg"
                onClick={remove}
              >
                {removeLabel}
              </Button>
            )}
          </div>
          {hint && (
            <p id={hintId} className="text-[11px] text-[#7a6e63]">
              {hint}
            </p>
          )}
          {shownError && (
            <p id={errorId} role="alert" className="text-xs text-[#a8532a]">
              {shownError}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
