import axios from 'axios'

/** Error de la API normalizado a partir del formato de error de NestJS. */
export class ApiError extends Error {
  readonly status: number | undefined
  readonly messages: string[]

  constructor(status: number | undefined, messages: string[]) {
    super(messages[0] ?? 'Error inesperado')
    this.name = 'ApiError'
    this.status = status
    this.messages = messages
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
    const { message } = (error.response.data ?? {}) as {
      message?: string | string[]
    }
    const messages = Array.isArray(message) ? message : message ? [message] : []
    return new ApiError(error.response.status, messages)
  }
  return new ApiError(undefined, ['Error inesperado'])
}
