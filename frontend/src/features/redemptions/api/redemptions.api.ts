// Este archivo hace las llamadas al backend para consultar canjes (US-45, contrato §3.12). Lo usan
// los hooks de redemptions.queries.ts; las pantallas no lo llaman directo.
import { toApiError } from '@/shared/api/ApiError'
import { http } from '@/shared/api/http'
import type {
  MyRedemption,
  MyRedemptionFilters,
  Paginated,
  Redemption,
  RedemptionFilters,
} from '../types/redemption'

// Mis canjes pide todo de una (§3.12.1: "La pantalla usa limit=100")
export const MY_REDEMPTIONS_LIMIT = 100

// Filas por página de la pantalla Canjes del Administrador (§3.12.3)
export const REDEMPTIONS_PAGE_SIZE = 10

// Mis canjes del Cliente (§3.12.1)
export async function getMyRedemptions(
  filters: MyRedemptionFilters,
): Promise<Paginated<MyRedemption>> {
  try {
    const { data } = await http.get<Paginated<MyRedemption>>('/customers/me/canjes', {
      params: { ...filters, page: 1, limit: MY_REDEMPTIONS_LIMIT },
    })
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

// Canjes para usar ahora de un cliente, para Cajero y Administrador (§3.12.2)
export async function getCustomerRedemptions(customerId: number): Promise<Redemption[]> {
  try {
    const { data } = await http.get<Redemption[]>(`/customers/${customerId}/canjes`)
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

// Pantalla Canjes del Administrador (§3.12.3)
export async function listRedemptions(
  filters: RedemptionFilters,
  page: number,
): Promise<Paginated<Redemption>> {
  try {
    const { data } = await http.get<Paginated<Redemption>>('/canjes', {
      params: { ...filters, page, limit: REDEMPTIONS_PAGE_SIZE },
    })
    return data
  } catch (error) {
    throw toApiError(error)
  }
}
