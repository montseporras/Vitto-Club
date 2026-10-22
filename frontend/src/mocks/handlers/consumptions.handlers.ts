// Mocks de US-22: consumos de las últimas 24 hs, saldo del cliente y anulación.
// Simulan lo que hace el backend según el contrato §3.2 y §3.4.1: `canVoid` y
// `voidableUntil` se calculan para quien llama (la cuenta de la sesión simulada).
import { delay, http, HttpResponse } from 'msw'
import type { Consumption } from '@/features/cashier'
import { API_URL } from '@/shared/api/http'
import { currentMockAccount } from './auth.handlers'
import { customers } from './cashier.handlers'

const HOUR = 60 * 60 * 1000
const hoursAgo = (hours: number) =>
  new Date(Date.now() - hours * HOUR).toISOString()

type StoredConsumption = Omit<Consumption, 'voidableUntil' | 'canVoid'>

const registeredBy = {
  bruno: { accountId: 2, name: 'Bruno Pérez' },
  diego: { accountId: 4, name: 'Diego Sosa' },
}

const customerOf = (id: number) => {
  const c = customers.find((item) => item.id === id)!
  return {
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    documentType: c.documentType,
    documentNumber: c.documentNumber,
  }
}

const base = {
  bonusPoints: 0,
  equivalence: { baseAmount: 1000, pointsAwarded: 10, configurationVersion: 4 },
  notes: null,
  voidedAt: null,
  voidedBy: null,
  voidReason: null,
}

// Para el Cajero Bruno: C-000141 es propio, C-000140 es ajeno, C-000139 tiene
// más de 24 hs (no llega al Cajero), C-000138 ya está anulado y C-000142
// (cliente 2) deja el saldo negativo al anularlo.
const consumptions: StoredConsumption[] = [
  {
    ...base,
    id: 141,
    code: 'C-000141',
    createdAt: hoursAgo(2),
    customer: customerOf(1),
    amount: 50000,
    points: 500,
    totalPoints: 500,
    status: 'REGISTERED',
    registeredBy: registeredBy.bruno,
  },
  {
    ...base,
    id: 140,
    code: 'C-000140',
    createdAt: hoursAgo(5),
    customer: customerOf(1),
    amount: 20000,
    points: 200,
    totalPoints: 200,
    status: 'REGISTERED',
    registeredBy: registeredBy.diego,
  },
  {
    ...base,
    id: 139,
    code: 'C-000139',
    createdAt: hoursAgo(30),
    customer: customerOf(1),
    amount: 12500,
    points: 125,
    totalPoints: 125,
    status: 'REGISTERED',
    registeredBy: registeredBy.bruno,
  },
  {
    ...base,
    id: 138,
    code: 'C-000138',
    createdAt: hoursAgo(3),
    customer: customerOf(1),
    amount: 15000,
    points: 150,
    totalPoints: 150,
    status: 'VOIDED',
    registeredBy: registeredBy.bruno,
    voidedAt: hoursAgo(1),
    voidedBy: registeredBy.bruno,
    voidReason: 'Monto cargado incorrectamente',
  },
  {
    ...base,
    id: 142,
    code: 'C-000142',
    createdAt: hoursAgo(1),
    customer: customerOf(2),
    amount: 50000,
    points: 500,
    totalPoints: 500,
    status: 'REGISTERED',
    registeredBy: registeredBy.bruno,
  },
]

const balances = new Map<number, number>([
  [1, 1240],
  [2, 150],
])

const STATUS_NAMES = {
  400: 'Bad Request',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
}

const errorResponse = (
  statusCode: 400 | 403 | 404 | 409,
  message: string | string[],
  path: string,
  code?: string,
) =>
  HttpResponse.json(
    {
      statusCode,
      error: STATUS_NAMES[statusCode],
      message,
      path,
      timestamp: new Date().toISOString(),
      ...(code ? { code } : {}),
    },
    { status: statusCode },
  )

// Regla del contrato §3.2.1: Admin con cualquier REGISTERED; Cajero solo con
// los propios y antes de las 24 hs.
const viewFor = (consumption: StoredConsumption): Consumption => {
  const account = currentMockAccount()
  const registered = consumption.status === 'REGISTERED'
  if (account?.role === 'ADMIN') {
    return { ...consumption, canVoid: registered, voidableUntil: null }
  }
  const own = consumption.registeredBy.accountId === account?.accountId
  const until = new Date(consumption.createdAt).getTime() + 24 * HOUR
  return {
    ...consumption,
    canVoid: registered && own && Date.now() < until,
    voidableUntil: own ? new Date(until).toISOString() : null,
  }
}

export const consumptionsHandlers = [
  // GET /api/customers/:id/consumos: el Cajero siempre recibe solo las últimas 24 hs.
  http.get(`${API_URL}/customers/:id/consumos`, async ({ params, request }) => {
    await delay(300)
    const url = new URL(request.url)
    const id = Number(params.id)
    if (!Number.isInteger(id)) {
      return errorResponse(400, 'Validation failed (numeric string is expected)', url.pathname)
    }
    if (!customers.some((c) => c.id === id)) {
      return errorResponse(404, `Customer with ID ${id} not found`, url.pathname)
    }

    const isAdmin = currentMockAccount()?.role === 'ADMIN'
    const last24h = isAdmin ? url.searchParams.get('last24h') === 'true' : true
    const limit = Number(url.searchParams.get('limit') ?? 20)
    const page = Number(url.searchParams.get('page') ?? 1)

    const items = consumptions
      .filter((c) => c.customer.id === id)
      .filter((c) => !last24h || Date.now() - new Date(c.createdAt).getTime() < 24 * HOUR)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return HttpResponse.json({
      items: items.slice((page - 1) * limit, page * limit).map(viewFor),
      total: items.length,
      page,
      limit,
    })
  }),

  // GET /api/customers/:id/puntos (US-46): solo lo que el modal necesita es real; el resto es fijo.
  http.get(`${API_URL}/customers/:id/puntos`, async ({ params, request }) => {
    await delay(200)
    const id = Number(params.id)
    const path = new URL(request.url).pathname
    if (!Number.isInteger(id)) {
      return errorResponse(400, 'Validation failed (numeric string is expected)', path)
    }
    if (!balances.has(id)) {
      return errorResponse(404, `Customer with ID ${id} not found`, path)
    }
    const balance = balances.get(id)!
    return HttpResponse.json({
      customerId: id,
      balance,
      negativeBalance: balance < 0,
      lifetimePoints: 1250,
      level: {
        current: 'SILVER',
        next: 'GOLD',
        currentMinPoints: 300,
        nextMinPoints: 800,
        pointsToNext: 0,
        progressPercent: 100,
      },
      nextExpirations: [],
    })
  }),

  // PATCH /api/consumos/:code/anular: 200 / 400 / 403 VOID_NOT_ALLOWED / 404 / 409 CONSUMPTION_ALREADY_VOIDED.
  http.patch<{ code: string }, { reason?: unknown }>(
    `${API_URL}/consumos/:code/anular`,
    async ({ params, request }) => {
      await delay(400)
      const path = new URL(request.url).pathname
      const body: { reason?: unknown } = await request.json().catch(() => ({}))
      const reason = typeof body.reason === 'string' ? body.reason.trim() : ''

      if (!/^C-\d{6}$/.test(params.code)) {
        return errorResponse(400, 'code must match /^C-\\d{6}$/', path)
      }
      if (reason === '') {
        return errorResponse(400, 'El motivo de anulación es obligatorio.', path)
      }
      if (reason.length < 5) {
        return errorResponse(400, 'Indicá un motivo de al menos 5 caracteres.', path)
      }

      const consumption = consumptions.find((c) => c.code === params.code)
      if (!consumption) {
        return errorResponse(404, `No existe el consumo ${params.code}.`, path)
      }
      if (consumption.status === 'VOIDED') {
        return errorResponse(409, 'Este consumo ya está anulado.', path, 'CONSUMPTION_ALREADY_VOIDED')
      }
      if (!viewFor(consumption).canVoid) {
        return errorResponse(
          403,
          'Solo podés anular consumos propios dentro de las 24 hs.',
          path,
          'VOID_NOT_ALLOWED',
        )
      }

      const account = currentMockAccount()!
      consumption.status = 'VOIDED'
      consumption.voidedAt = new Date().toISOString()
      consumption.voidedBy = {
        accountId: account.accountId,
        name: `${account.firstName} ${account.lastName}`,
      }
      consumption.voidReason = reason

      const balanceBefore = balances.get(consumption.customer.id) ?? 0
      const balanceAfter = balanceBefore - consumption.totalPoints
      balances.set(consumption.customer.id, balanceAfter)
      return HttpResponse.json({
        consumption: viewFor(consumption),
        balanceBefore,
        balanceAfter,
        negativeBalance: balanceAfter < 0,
      })
    },
  ),
]
