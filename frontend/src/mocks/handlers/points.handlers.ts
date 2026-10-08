// Este archivo simula el backend de la configuración de puntos mientras los endpoints
// reales no existen. Permite probar la pantalla completa sin levantar la API.
import { http, HttpResponse } from 'msw';
import { API_URL } from '@/shared/api/http';
import type { FirstPurchaseBonus, PointsEquivalence } from '@/features/points';

type BonusType = FirstPurchaseBonus['type'];

const FIRST_PURCHASE_BONUS_URL = `${API_URL}/settings/first-purchase-bonus`;
const POINTS_EQUIVALENCE_URL = `${API_URL}/settings/points-equivalence`;

// Estado en memoria. Arranca con el ejemplo del glosario: 30 puntos adicionales.
let firstPurchaseBonus: FirstPurchaseBonus = { type: 'FIXED', value: 30 };

// Estado en memoria. Arranca con el ejemplo del prototipo: 10 puntos cada $ 1000.
let pointsEquivalence: PointsEquivalence = { baseAmount: 1000, points: 10 };

// Mismos topes que el schema de Zod del formulario de equivalencia.
const MAX_BASE_AMOUNT = 1_000_000;
const MAX_POINTS = 10_000;

// Mismos topes que el schema de Zod del formulario.
const MAX_VALUE: Record<BonusType, number> = {
  PERCENTAGE: 100,
  FIXED: 10_000,
};

const isBonusType = (value: unknown): value is BonusType =>
  value === 'PERCENTAGE' || value === 'FIXED';

// Mismo formato de error que los filtros de excepción del backend.
const badRequest = (message: string[], request: Request) => {
  const { pathname, search } = new URL(request.url);
  return HttpResponse.json(
    {
      statusCode: 400,
      error: 'Bad Request',
      message,
      path: pathname + search,
      timestamp: new Date().toISOString(),
    },
    { status: 400 },
  );
};

// Equivalente al ValidationPipe global del backend. Devuelve la lista de
// mensajes; vacía si el body es válido.
function validateBody(body: Record<string, unknown>): string[] {
  const errors = Object.keys(body)
    .filter((key) => key !== 'type' && key !== 'value')
    .map((key) => `property ${key} should not exist`);

  const { type, value } = body;

  if (!isBonusType(type)) {
    errors.push('type must be one of the following values: PERCENTAGE, FIXED');
  }

  if (typeof value !== 'number' || !Number.isInteger(value)) {
    errors.push('value must be an integer number');
  } else if (value < 1) {
    errors.push('value must not be less than 1');
  } else if (isBonusType(type) && value > MAX_VALUE[type]) {
    errors.push(`value must not be greater than ${MAX_VALUE[type]}`);
  }

  return errors;
}

// Lo mismo para el body de la equivalencia de puntos.
function validatePointsEquivalenceBody(body: Record<string, unknown>): string[] {
  const errors = Object.keys(body)
    .filter((key) => key !== 'baseAmount' && key !== 'points')
    .map((key) => `property ${key} should not exist`);

  const { baseAmount, points } = body;

  if (typeof baseAmount !== 'number' || !Number.isFinite(baseAmount)) {
    errors.push('baseAmount must be a number');
  } else if (baseAmount <= 0) {
    errors.push('baseAmount must be a positive number');
  } else if (baseAmount > MAX_BASE_AMOUNT) {
    errors.push(`baseAmount must not be greater than ${MAX_BASE_AMOUNT}`);
  } else if (Math.abs(baseAmount * 100 - Math.round(baseAmount * 100)) >= 1e-6) {
    errors.push('baseAmount must have at most 2 decimal places');
  }

  if (typeof points !== 'number' || !Number.isInteger(points)) {
    errors.push('points must be an integer number');
  } else if (points < 1) {
    errors.push('points must not be less than 1');
  } else if (points > MAX_POINTS) {
    errors.push(`points must not be greater than ${MAX_POINTS}`);
  }

  return errors;
}

export const pointsHandlers = [
  // RF-011: GET /api/settings/first-purchase-bonus
  http.get(FIRST_PURCHASE_BONUS_URL, () =>
    HttpResponse.json(firstPurchaseBonus),
  ),

  // RF-011: PUT /api/settings/first-purchase-bonus responde 200 / 400.
  http.put(FIRST_PURCHASE_BONUS_URL, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;

    const errors = validateBody(body);
    if (errors.length) return badRequest(errors, request);

    firstPurchaseBonus = {
      type: body.type as BonusType,
      value: body.value as number,
    };
    return HttpResponse.json(firstPurchaseBonus);
  }),

  // RF-09: GET /api/settings/points-equivalence
  http.get(POINTS_EQUIVALENCE_URL, () => HttpResponse.json(pointsEquivalence)),

  // RF-09: PUT /api/settings/points-equivalence responde 200 / 400.
  http.put(POINTS_EQUIVALENCE_URL, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;

    const errors = validatePointsEquivalenceBody(body);
    if (errors.length) return badRequest(errors, request);

    pointsEquivalence = {
      baseAmount: body.baseAmount as number,
      points: body.points as number,
    };
    return HttpResponse.json(pointsEquivalence);
  }),
];