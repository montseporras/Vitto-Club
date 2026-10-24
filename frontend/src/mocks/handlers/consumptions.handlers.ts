// Este archivo simula GET /customers/me/consumos (contrato §3.10.2) para probar el historial
// del Cliente sin el backend. Devuelve la paginación { items, total, page, limit }, con los
// más nuevos primero y sin los campos que el Cliente no recibe.
import { http, HttpResponse } from 'msw';
import { API_URL } from '@/shared/api/http';
import type {
  ConsumptionStatus,
  CustomerConsumption,
} from '@/features/consumptions';

const equivalence = {
  baseAmount: 1000,
  pointsAwarded: 10,
  configurationVersion: 1,
};

const consumption = (
  id: number,
  createdAt: string,
  amount: number,
  bonusPoints: number,
  status: ConsumptionStatus,
): CustomerConsumption => {
  const points = Math.floor(
    (amount / equivalence.baseAmount) * equivalence.pointsAwarded,
  );
  return {
    id,
    code: `C-${String(id).padStart(6, '0')}`,
    createdAt,
    amount,
    points,
    bonusPoints,
    totalPoints: points + bonusPoints,
    equivalence,
    notes: null,
    status,
    voidedAt: status === 'VOIDED' ? createdAt : null,
    voidReason: status === 'VOIDED' ? 'Error de carga' : null,
  };
};

// Para ver el estado vacío ("Todavía no tenés consumos."), dejar este arreglo en [].
const myConsumptions: CustomerConsumption[] = [
  consumption(143, '2026-10-18T22:10:00.000Z', 12500.5, 0, 'REGISTERED'),
  consumption(131, '2026-10-12T16:30:00.000Z', 8000, 0, 'VOIDED'),
  consumption(120, '2026-10-05T15:05:00.000Z', 45000, 0, 'REGISTERED'),
  // El primer consumo registrado recibe la bonificación (+30)
  consumption(98, '2026-09-20T13:45:00.000Z', 20000, 30, 'REGISTERED'),
];

export const consumptionsHandlers = [
  http.get(`${API_URL}/customers/me/consumos`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 20);
    const items = myConsumptions.slice((page - 1) * limit, page * limit);
    return HttpResponse.json({
      items,
      total: myConsumptions.length,
      page,
      limit,
    });
  }),
];
