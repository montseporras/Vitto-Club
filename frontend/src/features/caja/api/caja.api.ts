import { toApiError } from '@/shared/api/ApiError'
import { http } from '@/shared/api/http'
import type { Client, CreateClientBody } from '../types/cliente'

export async function createClient(body: CreateClientBody) {
  try {
    const res = await http.post<Client>('/customers', body)
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}
