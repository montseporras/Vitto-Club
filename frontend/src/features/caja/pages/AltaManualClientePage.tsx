import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { TIPOS_DOCUMENTO, TIPOS_DOCUMENTO_VALUES } from '@/domain/documentos'
import { FormField } from '@/shared/components/forms/FormField'
import { Alert } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { useRegistrarCliente } from '../api/caja.queries'
import {
  altaClienteSchema,
  type AltaClienteFormInput,
  type AltaClienteFormOutput,
} from '../schemas/alta-cliente.schema'

const VALORES_INICIALES: AltaClienteFormInput = {
  nombre: '',
  apellido: '',
  tipoDocumento: 'DNI',
  numeroDocumento: '',
  email: '',
  telefono: '',
}

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
    formState: { errors },
  } = useForm<AltaClienteFormInput, unknown, AltaClienteFormOutput>({
    resolver: zodResolver(altaClienteSchema),
    defaultValues: VALORES_INICIALES,
    mode: 'onTouched',
  })
  const registrar = useRegistrarCliente()

  const onSubmit = (data: AltaClienteFormOutput) => {
    registrar.mutate(data, {
      onSuccess: () => {
        reset(VALORES_INICIALES)
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
    })
  }

  // Props comunes de accesibilidad para cada input con su mensaje de error
  const a11y = (campo: Exclude<keyof AltaClienteFormInput, 'tipoDocumento'>) => ({
    id: campo,
    'aria-invalid': errors[campo] ? true : undefined,
    'aria-describedby': errors[campo] ? `${campo}-error` : undefined,
  })

  const creado = registrar.isSuccess ? registrar.data : undefined
  const errorGeneral =
    registrar.isError && registrar.error.status !== 409 ? registrar.error : undefined

  return (
    <section className="rounded-[var(--radius)] border-2 border-divider bg-bg p-4 shadow-sm sm:p-6">
      <h2 className="text-2xl">Alta manual de cliente</h2>
      <p className="mt-1 text-sm text-neutral-700">
        Registrá al cliente cuando no lo encontrás por documento.
      </p>

      {creado && (
        <Alert variant="success" className="mt-4">
          Cliente registrado correctamente:{' '}
          <strong>
            {creado.nombre} {creado.apellido}
          </strong>{' '}
          ({TIPOS_DOCUMENTO[creado.tipoDocumento].label} {creado.numeroDocumento}).
        </Alert>
      )}

      {errorGeneral && (
        <Alert variant="error" className="mt-4">
          {errorGeneral.status === 400
            ? 'Revisá los datos: el servidor rechazó el alta.'
            : 'No se pudo registrar el cliente.'}
          {errorGeneral.messages.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {errorGeneral.messages.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}

      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 grid max-w-3xl gap-4 sm:grid-cols-2"
      >
        <FormField id="nombre" label="Nombre" error={errors.nombre?.message}>
          <Input autoFocus autoComplete="off" {...a11y('nombre')} {...register('nombre')} />
        </FormField>

        <FormField id="apellido" label="Apellido" error={errors.apellido?.message}>
          <Input autoComplete="off" {...a11y('apellido')} {...register('apellido')} />
        </FormField>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-semibold">Tipo de documento</legend>
          <div className="flex h-10 items-center gap-5">
            {TIPOS_DOCUMENTO_VALUES.map((tipo) => (
              <label key={tipo} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  value={tipo}
                  className="size-4 accent-accent"
                  {...register('tipoDocumento', {
                    // El formato válido depende del tipo: revalida el número ya escrito
                    onChange: () => {
                      if (getValues('numeroDocumento')) trigger('numeroDocumento')
                    },
                  })}
                />
                {TIPOS_DOCUMENTO[tipo].label}
              </label>
            ))}
          </div>
        </fieldset>

        <FormField
          id="numeroDocumento"
          label="Número de documento"
          error={errors.numeroDocumento?.message}
        >
          <Input
            placeholder="30111222"
            autoComplete="off"
            {...a11y('numeroDocumento')}
            {...register('numeroDocumento')}
          />
        </FormField>

        <FormField id="email" label="Correo electrónico" error={errors.email?.message}>
          <Input
            type="email"
            placeholder="cliente@mail.com"
            autoComplete="off"
            {...a11y('email')}
            {...register('email')}
          />
        </FormField>

        <FormField
          id="telefono"
          label="Teléfono (opcional)"
          error={errors.telefono?.message}
        >
          <Input
            type="tel"
            placeholder="351 1234567"
            autoComplete="off"
            {...a11y('telefono')}
            {...register('telefono')}
          />
        </FormField>

        <p className="text-xs text-neutral-600 sm:col-span-2">
          Obligatorio: nombre, apellido, tipo y número de documento, y correo
          electrónico.
        </p>

        <div className="sm:col-span-2">
          <Button type="submit" size="lg" disabled={registrar.isPending}>
            {registrar.isPending ? 'Registrando…' : 'Registrar cliente'}
          </Button>
        </div>
      </form>
    </section>
  )
}
