// Este archivo hace las llamadas al backend de canjes: consultar (US-45, contrato §3.12) y
// confirmar (US-40, §3.7.1) y usar (US-42, §3.9.1). Lo usan los hooks de redemptions.queries.ts; las pantallas no lo
// llaman directo.
import { toApiError } from '@/shared/api/ApiError'
import { http } from '@/shared/api/http'
import type {
  ConfirmedRedemption,
  MyRedemption,
  MyRedemptionFilters,
  Paginated,
  Redemption,
  RedemptionFilters,
  RegisterUseResult,
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

// Confirmar canje desde la app: el cliente sale del token, no va `customerId` en el body (§3.7.1)
export async function confirmMyRedemption(rewardId: number): Promise<ConfirmedRedemption> {
  try {
    const { data } = await http.post<{ redemption: ConfirmedRedemption }>(
      '/customers/me/canjes',
      { rewardId },
    )
    return data.redemption
  } catch (error) {
    throw toApiError(error)
  }
}

// Confirmar canje desde la caja, en nombre del cliente (§3.7.1)
export async function confirmCustomerRedemption(
  customerId: number,
  rewardId: number,
): Promise<ConfirmedRedemption> {
  try {
    const { data } = await http.post<{ redemption: ConfirmedRedemption }>(
      `/customers/${customerId}/canjes`,
      { rewardId },
    )
    return data.redemption
  } catch (error) {
    throw toApiError(error)
  }
}

// Registrar el uso de un canje: recién acá se descuentan los puntos y el stock (US-42, §3.9.1)
export async function registerRedemptionUse(code: string): Promise<RegisterUseResult> {
  try {
    const { data } = await http.patch<RegisterUseResult>(`/canjes/${code}/usar`)
    return data
  } catch (error) {
    throw toApiError(error)
  }
}
