// Hooks de TanStack Query de la vista del Cliente. Conectan las pantallas con
// my-account.api.ts y manejan carga, error y caché.
import { useQuery } from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import type { CustomerPoints } from '../types/customer-points'
import { getMyPoints } from './my-account.api'
import { myAccountKeys } from './my-account.keys'

// US-19: puntos del cliente de la sesión, para el Inicio.
export const useMyPoints = () =>
  useQuery<CustomerPoints, ApiError>({
    queryKey: myAccountKeys.points(),
    queryFn: getMyPoints,
    // Un 403 no se arregla reintentando (§6); solo se reintenta si no hubo respuesta
    retry: (count, error) => error.status === undefined && count < 1,
  })
