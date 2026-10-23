import type { ApiError } from '@/shared/api/ApiError'

/** Códigos de error de clientes (contrato §5): se decide por estos, nunca por el mensaje. */
export const CUSTOMER_ERROR_CODES = {
  EMAIL_IN_USE: 'EMAIL_IN_USE',
  // 409 al editar un cliente dado de baja (contrato §3.8.2)
  CUSTOMER_INACTIVE: 'CUSTOMER_INACTIVE',
} as const

// Texto del contrato §3.8.2
const CUSTOMER_INACTIVE_MESSAGE = 'El cliente está dado de baja.'

// El contrato no cita este texto: es el del prototipo (alta de cliente en Caja).
const EMAIL_IN_USE_MESSAGE = 'Ya hay un cliente registrado con ese correo electrónico.'

/** Un 409 de la API de clientes: qué dato está repetido (si es uno solo) y qué mostrar. */
export type CustomerConflict = {
  field?: 'email' | 'documentNumber'
  message: string
}

const isConflictField = (field: string): field is 'email' | 'documentNumber' =>
  field === 'email' || field === 'documentNumber'

/**
 * Traduce un 409 del alta, la edición o el autorregistro de clientes.
 * Primero se decide por `code` (EMAIL_IN_USE, CUSTOMER_INACTIVE). El autorregistro manda el
 * campo en `details`; el documento o el mail repetidos no traen código ni campo (contrato
 * §3.8.2: "sin cambios respecto del Sprint 2"), así que se deducen del mensaje del backend.
 */
export function customerConflict(error: ApiError): CustomerConflict | undefined {
  if (error.status !== 409) return undefined

  // El mail lo usa otro cliente, un empleado u otra cuenta activa: se marca en el campo del mail
  if (error.code === CUSTOMER_ERROR_CODES.EMAIL_IN_USE) {
    return { field: 'email', message: EMAIL_IN_USE_MESSAGE }
  }

  // Los clientes dados de baja son de solo lectura y no se reactivan
  if (error.code === CUSTOMER_ERROR_CODES.CUSTOMER_INACTIVE) {
    return { message: CUSTOMER_INACTIVE_MESSAGE }
  }

  const detail = error.details.find((item) => isConflictField(item.field))
  if (detail && isConflictField(detail.field)) {
    return { field: detail.field, message: detail.message }
  }

  const { message } = error
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
