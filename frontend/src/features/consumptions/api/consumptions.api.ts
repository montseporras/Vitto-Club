// Este archivo hace las llamadas al backend para consultar consumos. Lo usan los hooks de
// consumptions.queries.ts; las pantallas no lo llaman directo.
import type { Consumption } from '@/features/cashier';
import { toApiError } from '@/shared/api/ApiError';
import { http } from '@/shared/api/http';
import type {
  ConsumptionFilters,
  ConsumptionsListResponse,
  PaginatedConsumptions,
} from '../types/consumption';

// Consumos que se piden por vez; el "Ver más" de la pantalla trae la página siguiente.
export const HISTORY_PAGE_SIZE = 20;

// Filas por página del listado del Administrador (§3.3.1: "La pantalla usa 8").
export const CONSUMPTIONS_PAGE_SIZE = 8;

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

// Listado de la sección Consumos del Administrador (US-23, §3.3.1), con sus totales.
export async function listConsumptions(
  filters: ConsumptionFilters,
  page: number,
): Promise<ConsumptionsListResponse> {
  try {
    const { data } = await http.get<ConsumptionsListResponse>('/consumos', {
      params: { ...filters, page, limit: CONSUMPTIONS_PAGE_SIZE },
    });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

// Detalle de un consumo por su código visible, por ejemplo C-000141 (US-23, §3.3.2).
export async function getConsumption(code: string): Promise<Consumption> {
  try {
    const { data } = await http.get<Consumption>(`/consumos/${code}`);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}
