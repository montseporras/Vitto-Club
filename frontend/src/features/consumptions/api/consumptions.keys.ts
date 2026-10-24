// Este archivo define los nombres con los que se guarda en caché el historial de consumos.
export const consumptionsKeys = {
  all: ['consumptions'] as const,
  mine: () => [...consumptionsKeys.all, 'me'] as const,
};
