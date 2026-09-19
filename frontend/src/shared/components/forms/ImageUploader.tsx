import { useEffect, useId, useMemo, useRef } from 'react'
import { Button } from '@/shared/components/ui/Button'
import { Label } from '@/shared/components/ui/Label'
import { ACCEPTED_IMAGE_TYPES } from '@/shared/lib/image'

type ImageUploaderProps = {
  label: string
  value: File | null
  onChange: (file: File | null) => void
  error?: string
}

/** Selector de imagen con vista previa. Acepta JPG, PNG o WEBP de hasta 2 MB. */
export function ImageUploader({
  label,
  value,
  onChange,
  error,
}: ImageUploaderProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const preview = useMemo(
    () => (value ? URL.createObjectURL(value) : null),
    [value],
  )
  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  const clear = () => {
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>

      <div className="flex items-center gap-3">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-divider/60 bg-surface/70">
          {preview ? (
            <img
              src={preview}
              alt="Vista previa de la foto del cliente"
              className="size-full object-cover"
            />
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
              className="size-7 text-neutral-500"
            >
              <circle cx="12" cy="8" r="3.5" />
              <path d="M4.5 20a7.5 7.5 0 0 1 15 0" strokeLinecap="round" />
            </svg>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
            >
              {value ? 'Cambiar foto' : 'Elegir foto'}
            </Button>
            {value && (
              <Button type="button" variant="ghost" onClick={clear}>
                Quitar
              </Button>
            )}
          </div>
          <p className="truncate text-xs text-neutral-600">
            {value ? value.name : 'JPG, PNG o WEBP · hasta 2 MB'}
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        className="sr-only"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />

      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-accent-700">
          {error}
        </p>
      )}
    </div>
  )
}
