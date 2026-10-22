// Este archivo ofrece los hooks para consultar consumos con carga, error y caché.
import { useQuery } from '@tanstack/react-query';
import { getMyConsumptions } from './consumptions.api';
import { consumptionsKeys } from './consumptions.keys';

// Historial de consumos del cliente que inició sesión (US-23).
export const useMyConsumptions = () =>
  useQuery({
    queryKey: consumptionsKeys.mine(),
    queryFn: getMyConsumptions,
  });
