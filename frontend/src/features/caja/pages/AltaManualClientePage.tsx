import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { TIPOS_DOCUMENTO, TIPOS_DOCUMENTO_VALUES } from '@/domain/documentos'
import { FormField } from '@/shared/components/forms/FormField'
import { SegmentedRadio } from '@/shared/components/forms/SegmentedRadio'
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

const OPCIONES_DOCUMENTO = TIPOS_DOCUMENTO_VALUES.map((tipo) => ({
  value: tipo,
  label: TIPOS_DOCUMENTO[tipo].label,
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
    registrar.isError && registrar.error.status !== 409
      ? registrar.error
      : undefined
  const esDni = useWatch({ control, name: 'tipoDocumento' }) === 'DNI'

  return (
    <section className="mx-auto w-full max-w-3xl">
      <p className="font-heading text-xs font-extrabold uppercase tracking-[0.12em] text-accent-700">
        Clientes
      </p>
      <h2 className="mt-1 text-2xl sm:text-3xl">Alta manual de cliente</h2>
      <p className="mt-2 text-sm text-neutral-700">
        Registrá al cliente cuando no lo encontrás por documento.
      </p>

      {creado && (
        <Alert variant="success" className="mt-5">
          Cliente registrado correctamente:{' '}
          <strong>
            {creado.nombre} {creado.apellido}
          </strong>{' '}
          ({TIPOS_DOCUMENTO[creado.tipoDocumento].label}{' '}
          {creado.numeroDocumento}).
        </Alert>
      )}

      {errorGeneral && (
        <Alert variant="error" className="mt-5">
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
        className="mt-6 rounded-2xl border border-divider/50 bg-bg/80 p-5 shadow-lg backdrop-blur-sm sm:p-8"
      >
        <div className="grid gap-5 sm:grid-cols-2">
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
            opciones={OPCIONES_DOCUMENTO}
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
            hint={esDni ? 'Sin puntos ni espacios' : undefined}
          >
            <Input
              inputMode={esDni ? 'numeric' : 'text'}
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
            label="Teléfono (opcional)"
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
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 border-t border-divider/40 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-neutral-600">
            Obligatorio: nombre, apellido, tipo y número de documento, y correo
            electrónico.
          </p>
          <Button
            type="submit"
            size="lg"
            disabled={registrar.isPending}
            className="w-full sm:w-auto"
          >
            {registrar.isPending ? 'Registrando…' : 'Registrar cliente'}
          </Button>
        </div>
      </form>
    </section>
  )
}
