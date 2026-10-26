import { toApiError } from '@/shared/api/ApiError'
import { http } from '@/shared/api/http'
import type { AuditActor, AuditQueryParams, AuditResponse } from '../types/audit'

export async function listAuditEntries(params: AuditQueryParams) {
  try {
    const { data } = await http.get<AuditResponse>('/auditoria', { params })
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function listAuditActors() {
  try {
    const { data } = await http.get<AuditActor[]>('/auditoria/actores')
    return data
  } catch (error) {
    throw toApiError(error)
  }
}
