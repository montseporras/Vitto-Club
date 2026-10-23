import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import type { ApiError } from '@/shared/api/ApiError'
import { useToast } from '@/shared/components/feedback/useToast'
import { FormField } from '@/shared/components/forms/FormField'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { PasswordInput } from '@/shared/components/ui/PasswordInput'
import { displayDateToIso, isoToDisplayDate } from '@/shared/lib/dates'
import { useUpdateMyProfile } from '../api/my-account.queries'
import {
  contactSchema,
  normalizeEmail,
  type ContactFormValues,
} from '../schemas/contact.schema'
import { PASSWORD_MESSAGES } from '../schemas/password.schema'
import {
  MY_ACCOUNT_ERROR_CODES,
  type MyProfile,
  type UpdateMyProfileBody,
} from '../types/my-account'
import { BirthDateInput } from './BirthDateInput'
import { ProfileSection } from './ProfileSection'

type ContactField = keyof ContactFormValues

const valuesOf = (profile: MyProfile): ContactFormValues => ({
  phone: profile.phone ?? '',
  email: profile.email,
  dateOfBirth: isoToDisplayDate(profile.dateOfBirth),
  currentPassword: '',
})

/** Solo lo que cambió (§3.10.4). Vacío borra el teléfono o la fecha (null). */
function changesOf(form: ContactFormValues, profile: MyProfile): UpdateMyProfileBody {
  const body: UpdateMyProfileBody = {}
  const phone = form.phone.trim()
  if (phone !== (profile.phone ?? '')) body.phone = phone || null

  const date = form.dateOfBirth.trim()
  const dateIso = date ? displayDateToIso(date) : null
  if (dateIso !== profile.dateOfBirth) body.dateOfBirth = dateIso

  // El correo vuelto al original (con otras mayúsculas o espacios) no cuenta como cambio
  if (normalizeEmail(form.email) !== normalizeEmail(profile.email)) {
    body.email = form.email.trim()
    body.currentPassword = form.currentPassword
  }
  return body
}

/** "Datos de contacto" de Mi perfil: teléfono, correo y fecha de nacimiento. */
export function ContactForm({ profile }: { profile: MyProfile }) {
  const showToast = useToast()
  const updateProfile = useUpdateMyProfile()

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema(profile.email)),
    defaultValues: valuesOf(profile),
  })

  // Después de guardar, el formulario arranca de los datos nuevos
  useEffect(() => reset(valuesOf(profile)), [profile, reset])

  const form = useWatch({ control }) as ContactFormValues
  const changes = changesOf(form, profile)
  const hasChanges = Object.keys(changes).length > 0
  const emailChanged = 'email' in changes

  // Si el correo vuelve al original, el campo desaparece y su valor no se manda
  useEffect(() => {
    if (!emailChanged) setValue('currentPassword', '')
  }, [emailChanged, setValue])

  // Errores del backend: se decide por `code`; los que traen `details` van a su campo
  const showServerError = (error: ApiError): boolean => {
    switch (error.code) {
      case MY_ACCOUNT_ERROR_CODES.CURRENT_PASSWORD_INCORRECT:
        setError('currentPassword', { message: PASSWORD_MESSAGES.currentIncorrect })
        return true
      case MY_ACCOUNT_ERROR_CODES.TOO_MANY_ATTEMPTS:
        setError('currentPassword', { message: PASSWORD_MESSAGES.tooManyAttempts })
        return true
      case MY_ACCOUNT_ERROR_CODES.EMAIL_IN_USE:
        setError('email', { message: 'Ese correo ya está registrado' })
        return true
    }
    const fields = error.details.filter((detail) => detail.field in form)
    fields.forEach((detail) => setError(detail.field as ContactField, { message: detail.message }))
    return fields.length > 0
  }

  const onSubmit = handleSubmit((values) => {
    updateProfile.reset()
    updateProfile.mutate(changesOf(values, profile), {
      onSuccess: () => showToast('Datos actualizados'),
      onError: (error) => {
        // Sin campo señalado, el mensaje se muestra arriba del formulario
        if (showServerError(error)) updateProfile.reset()
      },
    })
  })

  const a11y = (field: ContactField, hint?: boolean) => ({
    id: `contact-${field}`,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field]
      ? `contact-${field}-error`
      : hint
        ? `contact-${field}-hint`
        : undefined,
  })

  return (
    <ProfileSection title="Datos de contacto">
      <form onSubmit={onSubmit} noValidate className="grid gap-5">
        {updateProfile.isError && (
          <Alert variant="error">
            <AlertMessages messages={updateProfile.error.messages} />
          </Alert>
        )}

        <FormField
          id="contact-phone"
          label="Teléfono"
          optional
          error={errors.phone?.message}
        >
          <Input type="tel" inputMode="tel" autoComplete="tel" {...a11y('phone')} {...register('phone')} />
        </FormField>

        <FormField
          id="contact-email"
          label="Correo electrónico"
          hideRequiredMark
          error={errors.email?.message}
          hint="Este correo es el que usás para ingresar."
        >
          <Input type="email" autoComplete="email" {...a11y('email', true)} {...register('email')} />
        </FormField>

        {emailChanged && (
          <FormField
            id="contact-currentPassword"
            label="Contraseña actual"
            hideRequiredMark
            error={errors.currentPassword?.message}
            hint="Para cambiar el correo con el que ingresás, confirmá tu contraseña."
          >
            <PasswordInput
              autoComplete="current-password"
              {...a11y('currentPassword', true)}
              {...register('currentPassword')}
            />
          </FormField>
        )}

        <FormField
          id="contact-dateOfBirth"
          label="Fecha de nacimiento"
          optional
          error={errors.dateOfBirth?.message}
        >
          <BirthDateInput {...a11y('dateOfBirth')} {...register('dateOfBirth')} />
        </FormField>

        <div className="flex flex-wrap justify-end gap-2.5">
          <Button
            type="button"
            variant="secondary"
            disabled={!hasChanges || updateProfile.isPending}
            onClick={() => {
              updateProfile.reset()
              reset(valuesOf(profile))
            }}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={!hasChanges || updateProfile.isPending}>
            {updateProfile.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </ProfileSection>
  )
}
