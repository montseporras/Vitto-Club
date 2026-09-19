import { toApiError } from '@/shared/api/ApiError'
import { http } from '@/shared/api/http'
import type { Cliente, RegistrarClienteDTO } from '../types/cliente'

export async function registrarCliente(data: RegistrarClienteDTO) {
  try {
    const res = await http.post<Cliente>('/clientes', data)
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}
