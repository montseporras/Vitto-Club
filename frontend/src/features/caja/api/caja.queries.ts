import { useMutation } from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import type { Client, CreateClientBody } from '../types/cliente'
import { createClient } from './caja.api'

export const useCreateClient = () =>
  useMutation<Client, ApiError, CreateClientBody>({
    mutationFn: createClient,
  })
