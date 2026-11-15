import { useMutation } from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import { startSession } from '../session'
import type { AuthResponse, LoginBody } from '../types/auth'
import type { RegisterCustomerBody } from '../types/register'
import { login, registerCustomer } from './auth.api'

/**
 * `minDurationMs`: tiempo mínimo hasta iniciar la sesión, para que se alcance a
 * ver la pantalla de carga. Un error no espera: se muestra enseguida.
 */
export const useLogin = (minDurationMs = 0) =>
  useMutation<AuthResponse, ApiError, LoginBody>({
    mutationFn: async (body) => {
      const [response] = await Promise.all([
        login(body),
        new Promise<void>((resolve) => setTimeout(resolve, minDurationMs)),
      ])
      return response
    },
    onSuccess: startSession,
  })

export const useRegisterCustomer = () =>
  useMutation<void, ApiError, RegisterCustomerBody>({
    mutationFn: registerCustomer,
  })
