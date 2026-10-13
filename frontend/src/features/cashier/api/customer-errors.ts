import type { ApiError } from '@/shared/api/ApiError'

/** Un 409 de la API de clientes: qué dato está repetido (si es uno solo) y qué mostrar. */
export type CustomerConflict = {
  field?: 'email' | 'documentNumber'
  message: string
}

const isConflictField = (field: string): field is 'email' | 'documentNumber' =>
  field === 'email' || field === 'documentNumber'

/**
 * Traduce un 409 del alta, la edición o el autorregistro de clientes.
 * El autorregistro manda el campo en `details` y el mensaje ya en español; el resto de la
 * API de clientes no trae código ni campo, así que se deduce del mensaje del backend.
 */
export function customerConflict(error: ApiError): CustomerConflict | undefined {
  if (error.status !== 409) return undefined

  const detail = error.details.find((item) => isConflictField(item.field))
  if (detail && isConflictField(detail.field)) {
    return { field: detail.field, message: detail.message }
  }

  const { message } = error
  // 'Customer with ID … is inactive: reactivate it before modifying'
  if (/\bis inactive\b/i.test(message)) {
    return { message: 'El cliente está dado de baja: reactivalo antes de modificarlo.' }
  }
  // 'Email "…" is already registered as an employee'
  if (/registered as an employee/i.test(message)) {
    return { field: 'email', message: 'Este mail ya está registrado como empleado' }
  }
  // Dos operaciones simultáneas: 'An active customer with that document or email already exists'
  if (/document or email/i.test(message)) {
    return { message: 'El documento o el mail ya pertenecen a otro cliente.' }
  }
  // 'An active customer with email "…" already exists' / 'Ya hay una cuenta registrada con ese email…'
  if (/\bemail\b/i.test(message)) {
    return { field: 'email', message: 'Ya existe un cliente registrado con este mail' }
  }
  // 'An active customer with DNI "…" already exists' / 'Ya hay un cliente registrado con ese documento (DNI)…'
  if (/\b(DNI|PASSPORT)\b/i.test(message)) {
    return {
      field: 'documentNumber',
      message: 'Ya existe un cliente registrado con este documento',
    }
  }
  return { message: 'El documento o el mail ya pertenecen a otro cliente.' }
}

/** Campos que el backend rechazó en un 400 (reglas del dominio), para marcarlos en el formulario. */
export function rejectedFields<Field extends string>(
  error: ApiError,
  fields: readonly Field[],
): Field[] {
  if (error.status !== 400) return []
  return fields.filter((field) =>
    error.details.some((item) => item.field === field),
  )
}

export const REJECTED_FIELD_MESSAGE = 'El servidor no aceptó este dato: revisalo'
