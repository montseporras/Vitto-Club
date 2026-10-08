import axios from 'axios'

/** Error de la API normalizado a partir del formato de error de NestJS. */
export class ApiError extends Error {
  readonly status: number | undefined
  readonly messages: string[]
  // Código estable del error (ej. LAST_ADMIN). Las decisiones se toman por
  // este campo, nunca por el texto del mensaje.
  readonly code: string | undefined

  constructor(status: number | undefined, messages: string[], code?: string) {
    super(messages[0] ?? 'Error inesperado')
    this.name = 'ApiError'
    this.status = status
    this.messages = messages
    this.code = code
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return new ApiError(undefined, [
        'No se pudo conectar con el servidor. Revisá la conexión e intentá de nuevo.',
      ])
    }
    const { message, code } = (error.response.data ?? {}) as {
      message?: string | string[]
      code?: string
    }
    const messages = Array.isArray(message) ? message : message ? [message] : []
    return new ApiError(error.response.status, messages, code)
  }
  return new ApiError(undefined, ['Error inesperado'])
}
