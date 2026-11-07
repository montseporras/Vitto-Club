// Nombres con los que se guardan en caché las recompensas. Todos cuelgan de ['rewards']: si una
// recompensa ya no está disponible al confirmar (US-40), invalidar esa clave refresca el mostrador
// y el catálogo del Cliente.
import type { CatalogFilter, RewardListFilters } from '../types/reward'

export const rewardsKeys = {
  all: ['rewards'] as const,
  adminLists: ['rewards', 'admin-list'] as const,
  adminList: (filters: RewardListFilters) => [...rewardsKeys.adminLists, filters] as const,
  available: () => [...rewardsKeys.all, 'available'] as const,
  catalog: (filter: CatalogFilter) => [...rewardsKeys.all, 'catalog', filter] as const,
}
