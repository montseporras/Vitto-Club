// Este archivo hace las llamadas al backend para consultar consumos. Lo usan los hooks de
// consumptions.queries.ts; las pantallas no lo llaman directo.
import { http } from '@/shared/api/http';
import type { PaginatedConsumptions } from '../types/consumption';

// La pantalla del Cliente no tiene paginador (prototipo): pide el máximo que permite el contrato.
const HISTORY_LIMIT = 100;

// Historial de consumos del cliente que inició sesión (US-23, §3.10.2). Más nuevos primero.
export async function getMyConsumptions(): Promise<PaginatedConsumptions> {
  const { data } = await http.get<PaginatedConsumptions>(
    '/customers/me/consumos',
    { params: { page: 1, limit: HISTORY_LIMIT } },
  );
  return data;
}
