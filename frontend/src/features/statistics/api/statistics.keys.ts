// Este archivo define los nombres con los que se guardan en caché las estadísticas.
// La raíz ['statistics'] se usa para invalidarlas todas (por ejemplo, al cambiar el mínimo de frecuente).
import type { MonthParam } from '../types/statistics';

export const statisticsKeys = {
  all: ['statistics'] as const,
  clients: (month: MonthParam) => [...statisticsKeys.all, 'clients', month] as const,
  consumptions: (month: MonthParam) => [...statisticsKeys.all, 'consumptions', month] as const,
  points: (month: MonthParam) => [...statisticsKeys.all, 'points', month] as const,
  program: (month: MonthParam) => [...statisticsKeys.all, 'program', month] as const,
};
