// Etiquetas de caché de TanStack Query para Mi cuenta (vista del Cliente).
export const myAccountKeys = {
  all: ['my-account'] as const,
  profile: () => [...myAccountKeys.all, 'profile'] as const,
  points: () => [...myAccountKeys.all, 'points'] as const,
}
