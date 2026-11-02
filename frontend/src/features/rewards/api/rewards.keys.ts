// Nombres con los que se guardan en caché las recompensas. Todos cuelgan de ['rewards'].
export const rewardsKeys = {
  all: ['rewards'] as const,
  available: () => [...rewardsKeys.all, 'available'] as const,
}
