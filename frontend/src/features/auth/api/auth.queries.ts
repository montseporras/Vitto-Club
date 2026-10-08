// Hooks de React Query del feature de acceso: las pantallas los usan en vez de llamar a la API directo.
import { useMutation } from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import type { RegisterCustomerBody } from '../types/register'
import { registerCustomer } from './auth.api'

export const useRegisterCustomer = () =>
  useMutation<void, ApiError, RegisterCustomerBody>({
    mutationFn: registerCustomer,
  })
