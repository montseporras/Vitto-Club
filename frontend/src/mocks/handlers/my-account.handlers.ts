// Simula GET /api/customers/me/puntos (US-19, contrato §3.10.1) para probar el Inicio del Cliente
// sin levantar la API. Para recorrer cada caso, cambiá SCENARIO y recargá la página.
import { delay, http, HttpResponse } from 'msw'
import type { CustomerPoints } from '@/features/my-account'
import { API_URL } from '@/shared/api/http'

type Scenario =
  | 'BRONZE'
  | 'SILVER'
  | 'GOLD'
  | 'NEGATIVE_BALANCE'
  | 'NO_EXPIRATIONS'
  | 'FORBIDDEN'
  | 'SERVER_ERROR'

const SCENARIO = 'SILVER' as Scenario

// Datos coherentes con las reglas del contrato (§3.4.1): umbrales por defecto 300 y 800,
// saldo = suma de los vencimientos pendientes (o deuda sin lotes) y progreso truncado.
const POINTS: Record<
  Exclude<Scenario, 'FORBIDDEN' | 'SERVER_ERROR'>,
  CustomerPoints
> = {
  BRONZE: {
    customerId: 1,
    balance: 120,
    negativeBalance: false,
    lifetimePoints: 120,
    level: {
      current: 'BRONZE',
      next: 'SILVER',
      currentMinPoints: 0,
      nextMinPoints: 300,
      pointsToNext: 180,
      progressPercent: 40,
    },
    nextExpirations: [{ points: 120, expiresAt: '2027-03-15' }],
  },
  SILVER: {
    customerId: 1,
    balance: 380,
    negativeBalance: false,
    lifetimePoints: 450,
    level: {
      current: 'SILVER',
      next: 'GOLD',
      currentMinPoints: 300,
      nextMinPoints: 800,
      pointsToNext: 350,
      progressPercent: 30,
    },
    nextExpirations: [
      { points: 200, expiresAt: '2026-11-30' },
      { points: 180, expiresAt: '2027-02-10' },
    ],
  },
  GOLD: {
    customerId: 1,
    balance: 1250,
    negativeBalance: false,
    lifetimePoints: 1250,
    level: {
      current: 'GOLD',
      next: null,
      currentMinPoints: 800,
      nextMinPoints: null,
      pointsToNext: 0,
      progressPercent: 100,
    },
    nextExpirations: [
      { points: 850, expiresAt: '2026-12-01' },
      { points: 400, expiresAt: '2027-04-20' },
    ],
  },
  // Una anulación dejó deuda: no quedan lotes activos, así que no hay vencimientos
  NEGATIVE_BALANCE: {
    customerId: 1,
    balance: -350,
    negativeBalance: true,
    lifetimePoints: 380,
    level: {
      current: 'SILVER',
      next: 'GOLD',
      currentMinPoints: 300,
      nextMinPoints: 800,
      pointsToNext: 420,
      progressPercent: 16,
    },
    nextExpirations: [],
  },
  NO_EXPIRATIONS: {
    customerId: 1,
    balance: 0,
    negativeBalance: false,
    lifetimePoints: 0,
    level: {
      current: 'BRONZE',
      next: 'SILVER',
      currentMinPoints: 0,
      nextMinPoints: 300,
      pointsToNext: 300,
      progressPercent: 0,
    },
    nextExpirations: [],
  },
}

const STATUS_NAMES = {
  401: 'Unauthorized',
  403: 'Forbidden',
  500: 'Internal Server Error',
}

// Mismo formato de error que los guards y los filtros del backend.
const errorResponse = (
  statusCode: 401 | 403 | 500,
  message: string,
  request: Request,
  code?: string,
) =>
  HttpResponse.json(
    {
      statusCode,
      error: STATUS_NAMES[statusCode],
      message,
      path: new URL(request.url).pathname,
      timestamp: new Date().toISOString(),
      ...(code ? { code } : {}),
    },
    { status: statusCode },
  )

export const myAccountHandlers = [
  // US-19: GET /api/customers/me/puntos responde 200 / 401 / 403.
  http.get(`${API_URL}/customers/me/puntos`, async ({ request }) => {
    await delay(400)

    if (!request.headers.get('Authorization')) {
      return errorResponse(401, 'Authentication required', request, 'UNAUTHENTICATED')
    }
    // Lo que responde el backend si el token no es de un Cliente (§4)
    if (SCENARIO === 'FORBIDDEN') {
      return errorResponse(
        403,
        'You do not have permission to perform this operation',
        request,
        'FORBIDDEN',
      )
    }
    if (SCENARIO === 'SERVER_ERROR') {
      return errorResponse(500, 'Unexpected error.', request)
    }

    return HttpResponse.json(POINTS[SCENARIO])
  }),
]
