import { useMutation } from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import type { Cliente, RegistrarClienteDTO } from '../types/cliente'
import { registrarCliente } from './caja.api'

export const useRegistrarCliente = () =>
  useMutation<Cliente, ApiError, RegistrarClienteDTO>({
    mutationFn: registrarCliente,
  })
