// Nombres con los que se guardan en caché los datos de la vista del Cliente. Los usan los hooks
// de my-account.queries.ts (y, más adelante, las historias que tengan que refrescarlos).
export const myAccountKeys = {
  all: ['my-account'] as const,
  points: () => [...myAccountKeys.all, 'points'] as const,
}
