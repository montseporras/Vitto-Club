// Este archivo hace las llamadas al backend de estadísticas (contrato S5 §3.9).
// Los cuatro endpoints reciben el mismo filtro `month` (YYYY-MM).
import { downloadFile } from '@/shared/api/download';
import { http } from '@/shared/api/http';
import { reportFileName } from '../lib/report';
import type {
  ClientsStatistics,
  ConsumptionsStatistics,
  MonthParam,
  PointsStatistics,
  ProgramStatistics,
  ReportSection,
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

// §3.9.5: baja el reporte PDF del mes con las secciones elegidas (ya ordenadas, sin repetir).
export const downloadStatisticsReport = (month: MonthParam, sections: ReportSection[]) =>
  downloadFile('/estadisticas/reporte.pdf', {
    params: { month, sections: sections.join(',') },
    fallbackName: reportFileName(month),
  });
