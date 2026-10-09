import { useMutation } from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import { endSession, startSession } from '../session'
import type { AuthResponse, LoginBody } from '../types/auth'
import type { RegisterCustomerBody } from '../types/register'
import { login, logout, registerCustomer } from './auth.api'

export const useLogin = () =>
  useMutation<AuthResponse, ApiError, LoginBody>({
    mutationFn: login,
    onSuccess: startSession,
  })

/** Si la llamada falla, la sesión se cierra igual en el front. */
export const useLogout = () =>
  useMutation<void, ApiError>({
    mutationFn: logout,
    onSettled: endSession,
  })

export const useRegisterCustomer = () =>
  useMutation<void, ApiError, RegisterCustomerBody>({
    mutationFn: registerCustomer,
  })
