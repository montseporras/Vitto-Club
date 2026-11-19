import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { updateSessionUser } from '@/features/auth'
import type { ApiError } from '@/shared/api/ApiError'
import type {
  ChangePasswordBody,
  ClaimMissionRewardResult,
  MyProfile,
  UpdateMyProfileBody,
} from '../types/my-account'
import {
  changeMyPassword,
  claimMissionReward,
  getMyMissions,
  getMyPoints,
  getMyProfile,
  updateMyProfile,
} from './my-account.api'
import { myAccountKeys } from './my-account.keys'

export const useMyProfile = () =>
  useQuery<MyProfile, ApiError>({
    queryKey: myAccountKeys.profile(),
    queryFn: getMyProfile,
  })

export const useMyPoints = () =>
  useQuery({ queryKey: myAccountKeys.points(), queryFn: getMyPoints })

/** Reclama la recompensa e invalida los datos de Mi cuenta que cambian (§3.3.3). */
export const useClaimMissionReward = () => {
  const qc = useQueryClient()
  return useMutation<ClaimMissionRewardResult, ApiError, number>({
    mutationFn: claimMissionReward,
    onSuccess: () => qc.invalidateQueries({ queryKey: myAccountKeys.all }),
  })
}

/** Misiones del mes del Cliente (S5 §3.3.2). Las muestran "Mis canjes" y "Misiones". */
export const useMyMissions = () =>
  useQuery({ queryKey: myAccountKeys.missions(), queryFn: getMyMissions })

/**
 * Guarda los datos de contacto. Si cambió el correo, cambió también el de
 * acceso: se actualiza en la sesión, que sigue abierta (§3.10.4).
 */
export const useUpdateMyProfile = () => {
  const qc = useQueryClient()
  return useMutation<MyProfile, ApiError, UpdateMyProfileBody>({
    mutationFn: updateMyProfile,
    onSuccess: (profile) => {
      qc.setQueryData(myAccountKeys.profile(), profile)
      updateSessionUser({ email: profile.email })
    },
  })
}

/**
 * Cambia la contraseña propia. El 204 no trae nada: mustChangePassword pasa a
 * false en la sesión para que la ventana de cambio no vuelva a abrirse.
 */
export const useChangeMyPassword = () =>
  useMutation<void, ApiError, ChangePasswordBody>({
    mutationFn: changeMyPassword,
    onSuccess: () => updateSessionUser({ mustChangePassword: false }),
  })
