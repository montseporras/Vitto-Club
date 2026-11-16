// Llamadas al backend de recompensas: Administración, mostrador y catálogo del Cliente.
// Las usan los hooks de rewards.queries.ts.
import { TABLE_PAGE_SIZE } from '@/shared/lib/pagination'
import { toApiError } from '@/shared/api/ApiError'
import { http } from '@/shared/api/http'
import type { Paginated } from '@/shared/types/pagination'
import type {
  ActivateRewardResponse,
  AdminReward,
  CatalogFilter,
  CreateRewardBody,
  CustomerCatalog,
  DeleteRewardResponse,
  DeactivateRewardResponse,
  Reward,
  RewardListFilters,
  RewardPhotoResponse,
  UpdateRewardBody,
  UpdateRewardResponse,
} from '../types/reward'

// Filas por página si la pantalla no puede calcular cuántas entran.
export const REWARDS_PAGE_SIZE = TABLE_PAGE_SIZE

/** Recompensas del Administrador (§3.2.1). */
export async function listAdminRewards({
  q,
  status,
  order,
  page,
  limit = REWARDS_PAGE_SIZE,
}: RewardListFilters): Promise<Paginated<AdminReward>> {
  try {
    const { data } = await http.get<Paginated<AdminReward>>('/recompensas', {
      params: {
        q: q || undefined,
        status: status || undefined,
        order,
        page,
        limit,
      },
    })
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

/** Detalle de una recompensa para el Administrador (§3.2.2). */
export async function getAdminReward(id: number): Promise<Reward> {
  try {
    const { data } = await http.get<Reward>(`/recompensas/${id}`)
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

/** Alta de una recompensa (§3.2.3). */
export async function createReward(body: CreateRewardBody): Promise<Reward> {
  try {
    const { data } = await http.post<Reward>('/recompensas', body)
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

/** Edición de una recompensa (§3.2.4). */
export async function updateReward(
  id: number,
  body: UpdateRewardBody,
): Promise<UpdateRewardResponse> {
  try {
    const { data } = await http.patch<UpdateRewardResponse>(`/recompensas/${id}`, body)
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

/** Sube o reemplaza la foto (S5 §3.5.1 y §3.5.2): `multipart/form-data` con el campo `photo`. */
export async function uploadRewardPhoto(id: number, file: File): Promise<RewardPhotoResponse> {
  const form = new FormData()
  form.append('photo', file)
  try {
    const { data } = await http.put<RewardPhotoResponse>(`/recompensas/${id}/foto`, form)
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

/** Quita la foto (S5 §3.5.2): `204`, vuelve la imagen genérica. */
export async function deleteRewardPhoto(id: number): Promise<void> {
  try {
    await http.delete(`/recompensas/${id}/foto`)
  } catch (error) {
    throw toApiError(error)
  }
}

/** Activación de una recompensa (§3.2.5). */
export async function activateReward(id: number): Promise<ActivateRewardResponse> {
  try {
    const { data } = await http.patch<ActivateRewardResponse>(`/recompensas/${id}/activar`)
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

/** Desactivación de una recompensa (§3.2.6). */
export async function deactivateReward(id: number): Promise<DeactivateRewardResponse> {
  try {
    const { data } = await http.patch<DeactivateRewardResponse>(`/recompensas/${id}/desactivar`)
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

/** Baja lógica de una recompensa (§3.2.7). */
export async function deleteReward(id: number): Promise<DeleteRewardResponse> {
  try {
    const { data } = await http.patch<DeleteRewardResponse>(`/recompensas/${id}/eliminar`)
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

// Recompensas disponibles para el mostrador, por puntos ascendentes (§3.5.2)
export async function getAvailableRewards(): Promise<Reward[]> {
  try {
    const { data } = await http.get<Reward[]>('/recompensas/disponibles')
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

// Catálogo del Cliente (§3.5.1): el cliente sale del token. Trae el saldo para no hacer dos pedidos.
export async function getMyCatalog(filter: CatalogFilter): Promise<CustomerCatalog> {
  try {
    const { data } = await http.get<CustomerCatalog>('/customers/me/recompensas', {
      params: { filter },
    })
    return data
  } catch (error) {
    throw toApiError(error)
  }
}
