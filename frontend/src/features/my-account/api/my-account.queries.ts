import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { updateSessionUser } from '@/features/auth'
import type { ApiError } from '@/shared/api/ApiError'
import type {
  ChangePasswordBody,
  MyProfile,
  UpdateMyProfileBody,
} from '../types/my-account'
import {
  changeMyPassword,
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
