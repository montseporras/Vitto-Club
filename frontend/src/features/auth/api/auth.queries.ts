import { useMutation } from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import { startSession } from '../session'
import type { AuthResponse, LoginBody } from '../types/auth'
import type { RegisterCustomerBody } from '../types/register'
import { login, registerCustomer } from './auth.api'

export const useLogin = () =>
  useMutation<AuthResponse, ApiError, LoginBody>({
    mutationFn: login,
    onSuccess: startSession,
  })

export const useRegisterCustomer = () =>
  useMutation<void, ApiError, RegisterCustomerBody>({
    mutationFn: registerCustomer,
  })
