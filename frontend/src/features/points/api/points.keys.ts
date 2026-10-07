// Este archivo define los nombres con los que se guarda en caché la configuración de
// puntos. Lo usan los hooks de points.queries.ts para leer y refrescar esos datos.
export const pointsKeys = {
  all: ['points'] as const,
  firstPurchaseBonus: () =>
    [...pointsKeys.all, 'first-purchase-bonus'] as const,
};