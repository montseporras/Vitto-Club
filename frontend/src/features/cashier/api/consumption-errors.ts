import type { ApiError } from '@/shared/api/ApiError'

/** Códigos de error de consumos (contrato §3.1.3): se decide por estos, nunca por el mensaje. */
export const CONSUMPTION_ERROR_CODES = {
  CUSTOMER_INACTIVE: 'CUSTOMER_INACTIVE',
  POINTS_EQUIVALENCE_NOT_CONFIGURED: 'POINTS_EQUIVALENCE_NOT_CONFIGURED',
} as const

// Textos del contrato §3.1.3
const MESSAGES: Record<string, string> = {
  [CONSUMPTION_ERROR_CODES.CUSTOMER_INACTIVE]:
    'El cliente está dado de baja. No se pueden registrar consumos.',
  [CONSUMPTION_ERROR_CODES.POINTS_EQUIVALENCE_NOT_CONFIGURED]:
    'Todavía no se configuró la equivalencia de puntos. Pedíselo a un administrador.',
}

/**
 * Qué mostrar ante un error de la vista previa o del registro. Los dos 409 tienen texto
 * en el contrato; el resto se muestra con el texto de la búsqueda y los mensajes del backend.
 */
export function consumptionError(error: ApiError): { text: string; details: string[] } {
  const known = error.status === 409 && error.code ? MESSAGES[error.code] : undefined
  if (known) return { text: known, details: [] }
  return { text: 'No se pudo buscar el cliente.', details: error.messages }
}
