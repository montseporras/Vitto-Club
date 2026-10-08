import { toApiError } from '@/shared/api/ApiError'
import { http } from '@/shared/api/http'
import type { AuthResponse, LoginBody } from '../types/auth'

export async function login(body: LoginBody) {
  try {
    const res = await http.post<AuthResponse>('/auth/login', body)
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}

/** Sin cuerpo: el backend identifica la sesión por la cookie httpOnly. */
export async function refresh() {
  try {
    const res = await http.post<AuthResponse>('/auth/refresh')
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function logout() {
  try {
    await http.post('/auth/logout')
  } catch (error) {
    throw toApiError(error)
  }
}
