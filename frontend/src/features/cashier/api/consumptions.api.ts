import { toApiError } from '@/shared/api/ApiError'
import { http } from '@/shared/api/http'
import type {
  ConsumptionsPage,
  VoidConsumptionBody,
  VoidConsumptionResponse,
} from '../types/consumption'

/** Consumos de las últimas 24 hs del cliente (contrato §3.2.1). */
export async function getCustomerConsumptions(customerId: number) {
  try {
    const res = await http.get<ConsumptionsPage>(
      `/customers/${customerId}/consumos`,
      { params: { last24h: true } },
    )
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function voidConsumption(
  code: string,
  body: VoidConsumptionBody,
) {
  try {
    const res = await http.patch<VoidConsumptionResponse>(
      `/consumos/${code}/anular`,
      body,
    )
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}
