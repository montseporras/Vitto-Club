// Este archivo define los nombres con los que se guarda en caché la configuración de
// puntos. Lo usan los hooks de points.queries.ts para leer y refrescar esos datos.
export const pointsKeys = {
  all: ['points'] as const,
  firstConsumptionBonus: () =>
    [...pointsKeys.all, 'first-consumption-bonus'] as const,
  equivalence: () => [...pointsKeys.all, 'equivalence'] as const,
  expiration: () => [...pointsKeys.all, 'expiration'] as const,
  loyaltyLevels: () => [...pointsKeys.all, 'loyalty-levels'] as const,
};