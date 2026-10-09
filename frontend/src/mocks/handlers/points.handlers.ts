// Este archivo simula el backend de la configuración de puntos para probar la pantalla
// completa sin levantar la API. Usa los mismos campos y validaciones que el backend.
import { http, HttpResponse } from 'msw';
import { API_URL } from '@/shared/api/http';
import { DEFAULT_POINTS_EXPIRATION_MONTHS } from '@/domain/expiration';
import type {
  FirstPurchaseBonus,
  PointsEquivalence,
  PointsExpiration,
} from '@/features/points';

type BonusType = FirstPurchaseBonus['bonusType'];

const FIRST_PURCHASE_BONUS_URL = `${API_URL}/settings/first-purchase-bonus`;
const POINTS_EQUIVALENCE_URL = `${API_URL}/settings/points-equivalence`;
const POINTS_EXPIRATION_URL = `${API_URL}/settings/points-expiration`;

// Fecha de la versión guardada, como la devuelve el backend en updatedAt.
const now = () => new Date().toISOString();

// Estado en memoria. Arranca con el ejemplo del glosario: 30 puntos adicionales.
let firstPurchaseBonus: FirstPurchaseBonus = {
  bonusType: 'FIXED_AMOUNT',
  bonusValue: 30,
  updatedAt: now(),
};

// Estado en memoria. Arranca con el ejemplo del prototipo: 10 puntos cada $ 1000.
let pointsEquivalence: PointsEquivalence = {
  baseAmount: 1000,
  pointsAwarded: 10,
  updatedAt: now(),
};

// Estado en memoria. Arranca con la vigencia por defecto: doce meses (RF-010).
let pointsExpiration: PointsExpiration = {
  pointsExpirationMonths: DEFAULT_POINTS_EXPIRATION_MONTHS,
  updatedAt: now(),
};

// Mismos topes que el schema de Zod del formulario de equivalencia.
const MAX_BASE_AMOUNT = 1_000_000;
const MAX_POINTS = 10_000;

// Mismo tope que el schema de Zod del formulario de vigencia.
const MAX_EXPIRATION_MONTHS = 120;

// Mismos topes que el schema de Zod del formulario.
const MAX_VALUE: Record<BonusType, number> = {
  PERCENTAGE: 100,
  FIXED_AMOUNT: 10_000,
};

const isBonusType = (value: unknown): value is BonusType =>
  value === 'PERCENTAGE' || value === 'FIXED_AMOUNT';

const hasAtMostTwoDecimals = (value: number) =>
  Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

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
    .filter((key) => key !== 'bonusType' && key !== 'bonusValue')
    .map((key) => `property ${key} should not exist`);

  const { bonusType, bonusValue } = body;

  if (!isBonusType(bonusType)) {
    errors.push(
      'bonusType must be one of the following values: PERCENTAGE, FIXED_AMOUNT',
    );
  }

  if (typeof bonusValue !== 'number' || !Number.isFinite(bonusValue)) {
    errors.push('bonusValue must be a number');
  } else if (bonusValue < 1) {
    errors.push('bonusValue must not be less than 1');
  } else if (isBonusType(bonusType) && bonusValue > MAX_VALUE[bonusType]) {
    errors.push(`bonusValue must not be greater than ${MAX_VALUE[bonusType]}`);
  } else if (bonusType === 'FIXED_AMOUNT' && !Number.isInteger(bonusValue)) {
    // Los puntos fijos son enteros; el porcentaje admite hasta 2 decimales.
    errors.push('bonusValue must be an integer number');
  } else if (bonusType === 'PERCENTAGE' && !hasAtMostTwoDecimals(bonusValue)) {
    errors.push('bonusValue must have at most 2 decimal places');
  }

  return errors;
}

// Lo mismo para el body de la equivalencia de puntos.
function validatePointsEquivalenceBody(body: Record<string, unknown>): string[] {
  const errors = Object.keys(body)
    .filter((key) => key !== 'baseAmount' && key !== 'pointsAwarded')
    .map((key) => `property ${key} should not exist`);

  const { baseAmount, pointsAwarded } = body;

  if (typeof baseAmount !== 'number' || !Number.isFinite(baseAmount)) {
    errors.push('baseAmount must be a number');
  } else if (baseAmount <= 0) {
    errors.push('baseAmount must be a positive number');
  } else if (baseAmount > MAX_BASE_AMOUNT) {
    errors.push(`baseAmount must not be greater than ${MAX_BASE_AMOUNT}`);
  } else if (!hasAtMostTwoDecimals(baseAmount)) {
    errors.push('baseAmount must have at most 2 decimal places');
  }

  if (typeof pointsAwarded !== 'number' || !Number.isInteger(pointsAwarded)) {
    errors.push('pointsAwarded must be an integer number');
  } else if (pointsAwarded < 1) {
    errors.push('pointsAwarded must not be less than 1');
  } else if (pointsAwarded > MAX_POINTS) {
    errors.push(`pointsAwarded must not be greater than ${MAX_POINTS}`);
  }

  return errors;
}

// Lo mismo para el body de la vigencia de los puntos.
function validatePointsExpirationBody(body: Record<string, unknown>): string[] {
  const errors = Object.keys(body)
    .filter((key) => key !== 'pointsExpirationMonths')
    .map((key) => `property ${key} should not exist`);

  const { pointsExpirationMonths: months } = body;

  if (typeof months !== 'number' || !Number.isInteger(months)) {
    errors.push('pointsExpirationMonths must be an integer number');
  } else if (months < 1) {
    errors.push('pointsExpirationMonths must not be less than 1');
  } else if (months > MAX_EXPIRATION_MONTHS) {
    errors.push(
      `pointsExpirationMonths must not be greater than ${MAX_EXPIRATION_MONTHS}`,
    );
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
      bonusType: body.bonusType as BonusType,
      bonusValue: body.bonusValue as number,
      updatedAt: now(),
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
      pointsAwarded: body.pointsAwarded as number,
      updatedAt: now(),
    };
    return HttpResponse.json(pointsEquivalence);
  }),

  // RF-010: GET /api/settings/points-expiration
  http.get(POINTS_EXPIRATION_URL, () => HttpResponse.json(pointsExpiration)),

  // RF-010: PUT /api/settings/points-expiration responde 200 / 400.
  http.put(POINTS_EXPIRATION_URL, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;

    const errors = validatePointsExpirationBody(body);
    if (errors.length) return badRequest(errors, request);

    pointsExpiration = {
      pointsExpirationMonths: body.pointsExpirationMonths as number,
      updatedAt: now(),
    };
    return HttpResponse.json(pointsExpiration);
  }),
];
