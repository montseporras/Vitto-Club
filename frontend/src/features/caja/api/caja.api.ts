import { toApiError } from '@/shared/api/ApiError'
import { http } from '@/shared/api/http'
import type { DocumentType } from '@/domain/documents'
import type {
  Client,
  CreateClientBody,
  UpdateClientBody,
} from '../types/cliente'

export async function createClient(body: CreateClientBody) {
  try {
    const res = await http.post<Client>('/customers', body)
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function findClientByDocument(
  documentType: DocumentType,
  documentNumber: string,
) {
  try {
    const res = await http.get<Client>('/customers/by-document', {
      params: { documentType, documentNumber },
    })
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function updateClient(id: number, body: UpdateClientBody) {
  try {
    const res = await http.patch<Client>(`/customers/${id}`, body)
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}
