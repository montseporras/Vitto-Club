// Llamadas al backend de la vista del Cliente. Las usan los hooks de my-account.queries.ts;
// las pantallas no las llaman directo.
import { toApiError } from '@/shared/api/ApiError'
import { http } from '@/shared/api/http'
import type { CustomerPoints } from '../types/customer-points'

// US-19 (§3.10.1): saldo, nivel y vencimientos del cliente de la sesión. El backend saca el
// cliente del token: no se manda ningún id.
export async function getMyPoints() {
  try {
    const res = await http.get<CustomerPoints>('/customers/me/puntos')
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}
