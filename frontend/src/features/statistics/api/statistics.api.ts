// Este archivo hace las llamadas al backend de estadísticas (contrato S5 §3.9).
// Los cuatro endpoints reciben el mismo filtro `month` (YYYY-MM).
import { http } from '@/shared/api/http';
import type {
  ClientsStatistics,
  ConsumptionsStatistics,
  MonthParam,
  PointsStatistics,
  ProgramStatistics,
} from '../types/statistics';

async function getStatistics<T>(path: string, month: MonthParam): Promise<T> {
  const { data } = await http.get<T>(`/estadisticas/${path}`, { params: { month } });
  return data;
}

export const getClientsStatistics = (month: MonthParam) =>
  getStatistics<ClientsStatistics>('clientes', month);

export const getConsumptionsStatistics = (month: MonthParam) =>
  getStatistics<ConsumptionsStatistics>('consumos', month);

export const getPointsStatistics = (month: MonthParam) =>
  getStatistics<PointsStatistics>('puntos', month);

export const getProgramStatistics = (month: MonthParam) =>
  getStatistics<ProgramStatistics>('programa', month);
