// Este archivo ofrece los hooks para consultar consumos con carga, error y caché.
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { Consumption } from '@/features/cashier';
import type { ApiError } from '@/shared/api/ApiError';
import type {
  ConsumptionFilters,
  ConsumptionsListResponse,
} from '../types/consumption';
import {
  getConsumption,
  getMyConsumptions,
  listConsumptions,
} from './consumptions.api';
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

// Listado de Consumos del Administrador (US-23): una página con los filtros ya aplicados.
export const useConsumptions = (filters: ConsumptionFilters, page: number) =>
  useQuery<ConsumptionsListResponse, ApiError>({
    queryKey: consumptionsKeys.list(filters, page),
    queryFn: () => listConsumptions(filters, page),
  });

// Detalle de un consumo (US-23). Un 400 o un 404 no se reintentan: no van a cambiar.
export const useConsumption = (code: string) =>
  useQuery<Consumption, ApiError>({
    queryKey: consumptionsKeys.detail(code),
    queryFn: () => getConsumption(code),
    retry: (count, error) => error.status === undefined && count < 1,
  });
