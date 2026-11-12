// Este archivo hace las llamadas al backend de canjes: consultar (US-45, contrato §3.12),
// confirmar (US-40, §3.7.1), usar (US-42, §3.9.1) y rechazar o cancelar (US-43, §3.10). Lo usan
// los hooks de redemptions.queries.ts; las pantallas no lo llaman directo.
import { toApiError } from '@/shared/api/ApiError'
import { http } from '@/shared/api/http'
import type {
  CancelRedemptionResult,
  ConfirmedRedemption,
  MyRedemption,
  MyRedemptionFilters,
  Paginated,
  Redemption,
  RedemptionFilters,
  RegisterUseResult,
  RejectRedemptionBody,
  RejectRedemptionResult,
} from '../types/redemption'

// Mis canjes pide todo de una (§3.12.1: "La pantalla usa limit=100")
export const MY_REDEMPTIONS_LIMIT = 100

// Filas por página de la pantalla Canjes del Administrador si no se puede calcular cuántas
// entran en su alto (ajustes S5-57; antes §3.12.3: 10)
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
  limit: number = REDEMPTIONS_PAGE_SIZE,
): Promise<Paginated<Redemption>> {
  try {
    const { data } = await http.get<Paginated<Redemption>>('/canjes', {
      params: { ...filters, page, limit },
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

// Rechazar un canje Confirmado, con motivo (US-43, §3.10.1). Solo Cajero y Administrador. No
// reintegra nada: confirmar no había descontado ni puntos ni stock.
export async function rejectRedemption(
  code: string,
  body: RejectRedemptionBody,
): Promise<RejectRedemptionResult> {
  try {
    const { data } = await http.patch<RejectRedemptionResult>(`/canjes/${code}/rechazar`, body)
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

// El Cliente cancela un canje propio Confirmado (US-43, §3.10.3). Sin body: el cliente sale del
// token. No se audita ni reintegra nada.
export async function cancelMyRedemption(code: string): Promise<CancelRedemptionResult> {
  try {
    const { data } = await http.patch<CancelRedemptionResult>(
      `/customers/me/canjes/${code}/cancelar`,
    )
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

// Canjes por código (US-41, §3.8.1): el canje completo en cualquier estado. El backend normaliza el
// código y vence al leer; un código inexistente o mal escrito responde 404 "Código no encontrado."
export async function getRedemptionByCode(code: string): Promise<Redemption> {
  try {
    const { data } = await http.get<Redemption>(`/canjes/${encodeURIComponent(code)}`)
    return data
  } catch (error) {
    throw toApiError(error)
  }
}
