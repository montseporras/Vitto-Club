// Este archivo hace las llamadas al backend para consultar consumos. Lo usan los hooks de
// consumptions.queries.ts; las pantallas no lo llaman directo.
import { http } from '@/shared/api/http';
import type { PaginatedConsumptions } from '../types/consumption';

// Consumos que se piden por vez; el "Ver más" de la pantalla trae la página siguiente.
export const HISTORY_PAGE_SIZE = 20;

// Una página del historial de consumos del cliente que inició sesión (US-23, §3.10.2).
// Vienen ordenados del más nuevo al más viejo.
export async function getMyConsumptions(
  page: number,
): Promise<PaginatedConsumptions> {
  const { data } = await http.get<PaginatedConsumptions>(
    '/customers/me/consumos',
    { params: { page, limit: HISTORY_PAGE_SIZE } },
  );
  return data;
}
