// Hooks para consultar canjes con carga, error y caché (US-45).
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import type {
  MyRedemption,
  MyRedemptionFilters,
  Paginated,
  Redemption,
  RedemptionFilters,
} from '../types/redemption'
import { getCustomerRedemptions, getMyRedemptions, listRedemptions } from './redemptions.api'
import { redemptionsKeys } from './redemptions.keys'

// Mis canjes del Cliente (§3.12.1). `enabled` deja de pedir cuando el filtro de fechas está
// invertido: la pantalla no llama al backend (CA-45.1).
export const useMyRedemptions = (filters: MyRedemptionFilters, enabled = true) =>
  useQuery<Paginated<MyRedemption>, ApiError>({
    queryKey: redemptionsKeys.mine(filters),
    queryFn: () => getMyRedemptions(filters),
    enabled,
    placeholderData: keepPreviousData,
  })

// Canjes para usar ahora de un cliente (§3.12.2). El panel se actualiza cada vez que se abre.
export const useCustomerRedemptions = (customerId: number, enabled = true) =>
  useQuery<Redemption[], ApiError>({
    queryKey: redemptionsKeys.ofCustomer(customerId),
    queryFn: () => getCustomerRedemptions(customerId),
    enabled,
    staleTime: 0,
  })

// Pantalla Canjes del Administrador (§3.12.3): una página con los filtros ya aplicados.
export const useRedemptions = (filters: RedemptionFilters, page: number) =>
  useQuery<Paginated<Redemption>, ApiError>({
    queryKey: redemptionsKeys.list(filters, page),
    queryFn: () => listRedemptions(filters, page),
    placeholderData: keepPreviousData,
  })
