// Este archivo define los nombres con los que se guardan en caché los consumos. Todos cuelgan
// de ['consumptions']: después de anular, invalidar esa clave refresca el listado y el detalle.
import type { ConsumptionFilters } from '../types/consumption';

export const consumptionsKeys = {
  all: ['consumptions'] as const,
  mine: () => [...consumptionsKeys.all, 'me'] as const,
  list: (filters: ConsumptionFilters, page: number) =>
    [...consumptionsKeys.all, 'list', filters, page] as const,
  detail: (code: string) => [...consumptionsKeys.all, 'detail', code] as const,
};
