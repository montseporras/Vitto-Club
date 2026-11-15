import { toApiError } from '@/shared/api/ApiError'
import { http } from '@/shared/api/http'
import type {
  ChangePasswordBody,
  ClaimMissionRewardResult,
  MyPoints,
  MyProfile,
  UpdateMyProfileBody,
} from '../types/my-account'

/** GET /customers/me (§3.10.3): solo el Cliente, con el cliente del token. */
export async function getMyProfile() {
  try {
    const res = await http.get<MyProfile>('/customers/me')
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}

/** PATCH /customers/me (§3.10.4): 200 con el perfil actualizado. */
export async function updateMyProfile(body: UpdateMyProfileBody) {
  try {
    const res = await http.patch<MyProfile>('/customers/me', body)
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}

/** GET /customers/me/puntos (§3.10.1): saldo, nivel y vencimientos. */
export async function getMyPoints() {
  try {
    const res = await http.get<MyPoints>('/customers/me/puntos')
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}

/** PATCH /customers/me/misiones/:id/reclamar (§3.3.3): reclama una misión completada. */
export async function claimMissionReward(customerMissionId: number) {
  try {
    const res = await http.patch<ClaimMissionRewardResult>(
      `/customers/me/misiones/${customerMissionId}/reclamar`,
    )
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}

/**
 * PATCH /mi-cuenta/password (§3.11.1): 204 sin cuerpo. La cookie del refresh
 * tiene que viajar (withCredentials, en http.ts): con ella el backend sabe cuál
 * es la sesión actual y no la cierra.
 */
export async function changeMyPassword(body: ChangePasswordBody) {
  try {
    await http.patch('/mi-cuenta/password', body)
  } catch (error) {
    throw toApiError(error)
  }
}
