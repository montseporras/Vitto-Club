import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { DOCUMENT_TYPES, DOCUMENT_TYPE_VALUES } from '@/domain/documents'
import { FormField } from '@/shared/components/forms/FormField'
import { ImageUploader } from '@/shared/components/forms/ImageUploader'
import { SegmentedRadio } from '@/shared/components/forms/SegmentedRadio'
import { Alert } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { validatePhoto } from '@/shared/lib/image'
import { useCreateClient } from '../api/caja.queries'
import { fileToDataUrl } from '../lib/fileToDataUrl'
import {
  altaClienteSchema,
  type AltaClienteFormInput,
  type AltaClienteFormOutput,
} from '../schemas/alta-cliente.schema'

const INITIAL_VALUES: AltaClienteFormInput = {
  nombre: '',
  apellido: '',
  tipoDocumento: 'DNI',
  numeroDocumento: '',
  email: '',
  telefono: '',
  fechaNacimiento: '',
}

const TODAY = new Date().toISOString().slice(0, 10)

const DOCUMENT_OPTIONS = DOCUMENT_TYPE_VALUES.map((type) => ({
  value: type,
  label: DOCUMENT_TYPES[type].label,
}))

/** US-17 · RF-015: el Cajero da de alta a un cliente que no encontró por documento. */
export function AltaManualClientePage() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    trigger,
    getValues,
    control,
    formState: { errors },
  } = useForm<AltaClienteFormInput, unknown, AltaClienteFormOutput>({
    resolver: zodResolver(altaClienteSchema),
    defaultValues: INITIAL_VALUES,
    mode: 'onTouched',
  })
  const createClient = useCreateClient()
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoError, setPhotoError] = useState<string>()

  const handlePhotoChange = (file: File | null) => {
    const error = file ? validatePhoto(file) : undefined
    setPhotoError(error)
    setPhoto(error ? null : file)
  }

  const onSubmit = async (data: AltaClienteFormOutput) => {
    if (photoError) return
    const foto = photo ? await fileToDataUrl(photo) : undefined

    createClient.mutate(
      { ...data, foto },
      {
        onSuccess: () => {
          reset(INITIAL_VALUES)
          setPhoto(null)
          setFocus('nombre')
        },
        onError: (error) => {
          if (error.status === 409) {
            setError(
              'numeroDocumento',
              { message: 'Ya existe un cliente registrado con este documento' },
              { shouldFocus: true },
            )
          }
        },
      },
    )
  }

  // Props comunes de accesibilidad para cada input con su mensaje de error
  const a11y = (
    field: Exclude<keyof AltaClienteFormInput, 'tipoDocumento'>,
  ) => ({
    id: field,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `${field}-error` : undefined,
  })

  const created = createClient.isSuccess ? createClient.data : undefined
  const generalError =
    createClient.isError && createClient.error.status !== 409
      ? createClient.error
      : undefined
  const isDni = useWatch({ control, name: 'tipoDocumento' }) === 'DNI'

  return (
    <section className="mx-auto w-full max-w-3xl">
      <p className="font-heading text-xs font-extrabold uppercase tracking-[0.12em] text-accent-700">
        Clientes
      </p>
      <h2 className="mt-1 text-2xl sm:text-3xl">Alta manual de cliente</h2>
      <p className="mt-2 text-sm text-neutral-700">
        Registrá al cliente cuando no lo encontrás por documento.
      </p>

      {created && (
        <Alert variant="success" className="mt-5">
          <div className="flex items-center gap-3">
            {created.fotoUrl && (
              <img
                src={created.fotoUrl}
                alt=""
                className="size-10 shrink-0 rounded-full object-cover"
              />
            )}
            <p>
              Cliente registrado correctamente:{' '}
              <strong>
                {created.nombre} {created.apellido}
              </strong>{' '}
              ({DOCUMENT_TYPES[created.tipoDocumento].label}{' '}
              {created.numeroDocumento}).
            </p>
          </div>
        </Alert>
      )}

      {generalError && (
        <Alert variant="error" className="mt-5">
          {generalError.status === 400
            ? 'Revisá los datos: el servidor rechazó el alta.'
            : 'No se pudo registrar el cliente.'}
          {generalError.messages.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {generalError.messages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}

      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 rounded-2xl border border-divider/50 bg-bg/80 p-5 shadow-lg backdrop-blur-sm sm:p-8"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <ImageUploader
              label="Fotografía"
              value={photo}
              onChange={handlePhotoChange}
              error={photoError}
            />
          </div>

          <FormField id="nombre" label="Nombre" error={errors.nombre?.message}>
            <Input
              autoFocus
              autoComplete="off"
              {...a11y('nombre')}
              {...register('nombre')}
            />
          </FormField>

          <FormField
            id="apellido"
            label="Apellido"
            error={errors.apellido?.message}
          >
            <Input
              autoComplete="off"
              {...a11y('apellido')}
              {...register('apellido')}
            />
          </FormField>

          <SegmentedRadio
            legend="Tipo de documento"
            options={DOCUMENT_OPTIONS}
            field={register('tipoDocumento', {
              // El formato válido depende del tipo: revalida el número ya escrito
              onChange: () => {
                if (getValues('numeroDocumento')) trigger('numeroDocumento')
              },
            })}
          />

          <FormField
            id="numeroDocumento"
            label="Número de documento"
            error={errors.numeroDocumento?.message}
          >
            <Input
              inputMode={isDni ? 'numeric' : 'text'}
              placeholder="30111222"
              autoComplete="off"
              {...a11y('numeroDocumento')}
              {...register('numeroDocumento')}
            />
          </FormField>

          <FormField
            id="email"
            label="Correo electrónico"
            error={errors.email?.message}
          >
            <Input
              type="email"
              inputMode="email"
              placeholder="cliente@mail.com"
              autoComplete="off"
              {...a11y('email')}
              {...register('email')}
            />
          </FormField>

          <FormField
            id="telefono"
            label="Teléfono"
            error={errors.telefono?.message}
          >
            <Input
              type="tel"
              inputMode="tel"
              placeholder="351 1234567"
              autoComplete="off"
              {...a11y('telefono')}
              {...register('telefono')}
            />
          </FormField>

          <FormField
            id="fechaNacimiento"
            label="Fecha de nacimiento"
            error={errors.fechaNacimiento?.message}
          >
            <Input
              type="date"
              max={TODAY}
              {...a11y('fechaNacimiento')}
              {...register('fechaNacimiento')}
            />
          </FormField>
        </div>

        <div className="mt-7 flex justify-end border-t border-divider/40 pt-5">
          <Button
            type="submit"
            size="lg"
            disabled={createClient.isPending}
            className="w-full sm:w-auto"
          >
            {createClient.isPending ? 'Registrando…' : 'Registrar cliente'}
          </Button>
        </div>
      </form>
    </section>
  )
}
