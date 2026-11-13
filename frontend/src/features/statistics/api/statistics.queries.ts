// Este archivo ofrece los hooks que leen las estadísticas de un mes.
// La pantalla pide los cuatro endpoints al cambiar el mes (contrato S5 §3.9.7), porque cada
// pestaña muestra un total.
import { useQuery } from '@tanstack/react-query';
import type { MonthParam } from '../types/statistics';
import {
  getClientsStatistics,
  getConsumptionsStatistics,
  getPointsStatistics,
  getProgramStatistics,
} from './statistics.api';
import { statisticsKeys } from './statistics.keys';

export const useClientsStatistics = (month: MonthParam) =>
  useQuery({
    queryKey: statisticsKeys.clients(month),
    queryFn: () => getClientsStatistics(month),
  });

export const useConsumptionsStatistics = (month: MonthParam) =>
  useQuery({
    queryKey: statisticsKeys.consumptions(month),
    queryFn: () => getConsumptionsStatistics(month),
  });

export const usePointsStatistics = (month: MonthParam) =>
  useQuery({
    queryKey: statisticsKeys.points(month),
    queryFn: () => getPointsStatistics(month),
  });

export const useProgramStatistics = (month: MonthParam) =>
  useQuery({
    queryKey: statisticsKeys.program(month),
    queryFn: () => getProgramStatistics(month),
  });
