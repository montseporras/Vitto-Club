// Este archivo ofrece los hooks para consultar consumos con carga, error y caché.
import { useInfiniteQuery } from '@tanstack/react-query';
import { getMyConsumptions } from './consumptions.api';
import { consumptionsKeys } from './consumptions.keys';

// Historial de consumos del cliente que inició sesión (US-23). Va trayendo páginas a medida
// que se pide "Ver más"; hay otra página mientras no se hayan cargado todos los consumos.
export const useMyConsumptions = () =>
  useInfiniteQuery({
    queryKey: consumptionsKeys.mine(),
    queryFn: ({ pageParam }) => getMyConsumptions(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.items.length, 0);
      return loaded < lastPage.total ? lastPage.page + 1 : undefined;
    },
  });
