// Llamadas HTTP del feature de acceso: conecta el formulario de registro con la API.
import { toApiError } from '@/shared/api/ApiError'
import { http } from '@/shared/api/http'
import type { RegisterCustomerBody } from '../types/register'

/** POST /auth/register (público): 201 / 400 / 409 (documento o mail ya registrados). */
export async function registerCustomer(body: RegisterCustomerBody) {
  try {
    await http.post('/auth/register', body)
  } catch (error) {
    throw toApiError(error)
  }
}
