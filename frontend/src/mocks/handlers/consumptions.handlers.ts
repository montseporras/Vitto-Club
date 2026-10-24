// Mocks de consumos: GET /customers/me/consumos (historial del Cliente, US-23, §3.10.2),
// GET /consumos/preview y POST /consumos (US-21, §3.1.2 y §3.1.3).
import { delay, http, HttpResponse } from 'msw'
import type {
  Consumption,
  ConsumptionPreview,
  CreateConsumptionResult,
} from '@/features/cashier'
import type { ConsumptionStatus, CustomerConsumption } from '@/features/consumptions'
import { API_URL } from '@/shared/api/http'
import { accountFromRequest } from './auth.handlers'
import {
  customers,
  errorResponse,
  levelOf,
  movementSeeds,
  pointsByCustomer,
} from './cashier.handlers'

// US-21: GET /api/consumos/preview y POST /api/consumos (contrato §3.1.2 y §3.1.3).
// Simulan lo que hace el backend: la pantalla no calcula nada.

// Configuración vigente de ejemplo: $1.000 = 10 pts y 15 % de bonificación por primer consumo
const EQUIVALENCE = { baseAmount: 1000, pointsAwarded: 10, configurationVersion: 4 }
const FIRST_CONSUMPTION_BONUS = { bonusType: 'PERCENTAGE', bonusValue: 15 } as const

const MAX_AMOUNT = 9999999999.99
const DAY = 24 * 3_600_000

// Para forzar los dos 409 desde la pantalla (solo en los mocks), según el monto:
//   $666 → POINTS_EQUIVALENCE_NOT_CONFIGURED
//   $777 → CUSTOMER_INACTIVE (el cliente se dio de baja entre la búsqueda y el registro)
const NO_EQUIVALENCE_AMOUNT = 666
const INACTIVE_AMOUNT = 777

// Clientes con al menos un consumo REGISTERED (Lucía y Martín, por sus movimientos).
// Los demás, como Sofía (id 4) o un cliente recién dado de alta, reciben la bonificación.
const customersWithConsumption = new Set<number>([1, 2])

let nextConsumptionId = 142

const codeOf = (id: number) => `C-${String(id).padStart(6, '0')}`

// Monto válido: > 0, máximo 2 decimales y máximo 9999999999.99
const isValidAmount = (value: number) =>
  Number.isFinite(value) &&
  value > 0 &&
  value <= MAX_AMOUNT &&
  Math.round(value * 100) / 100 === value

/** Reglas comunes: 401 sin token, 403 para el Cliente, 404 si no existe, 409 si no se puede. */
function checkRequest(request: Request, customerId: unknown, amount: unknown) {
  const path = new URL(request.url).pathname
  const account = accountFromRequest(request)
  if (!account) return { error: errorResponse(401, 'Token inválido o vencido.', path, 'UNAUTHENTICATED') }
  if (account.role === 'CUSTOMER') {
    return { error: errorResponse(403, 'No tenés permiso para realizar esta acción.', path, 'FORBIDDEN') }
  }
  if (typeof customerId !== 'number' || !Number.isInteger(customerId)) {
    return { error: errorResponse(400, 'customerId must be an integer number', path) }
  }
  if (typeof amount !== 'number' || !isValidAmount(amount)) {
    return { error: errorResponse(400, 'amount must be a positive number with up to 2 decimal places', path) }
  }
  const customer = customers.find((c) => c.id === customerId)
  if (!customer) return { error: errorResponse(404, `No existe el cliente ${customerId}.`, path) }
  if (!customer.active || amount === INACTIVE_AMOUNT) {
    return { error: errorResponse(409, 'El cliente está dado de baja.', path, 'CUSTOMER_INACTIVE') }
  }
  if (amount === NO_EQUIVALENCE_AMOUNT) {
    return {
      error: errorResponse(
        409,
        'No hay una equivalencia de puntos configurada.',
        path,
        'POINTS_EQUIVALENCE_NOT_CONFIGURED',
      ),
    }
  }
  return { account, customer, amount }
}

// Mismo cálculo que el backend (contrato §3.1.2): se trunca
function calculate(customerId: number, amount: number) {
  const points = Math.floor((amount / EQUIVALENCE.baseAmount) * EQUIVALENCE.pointsAwarded)
  const isFirstConsumption = !customersWithConsumption.has(customerId)
  const bonusPoints = isFirstConsumption
    ? Math.floor((points * FIRST_CONSUMPTION_BONUS.bonusValue) / 100)
    : 0
  return { points, bonusPoints, totalPoints: points + bonusPoints, isFirstConsumption }
}

// --- Historial del Cliente (US-23, §3.10.2): paginación { items, total, page, limit }, con los
// más nuevos primero y sin los campos que el Cliente no recibe.

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
  http.get(`${API_URL}/consumos/preview`, async ({ request }) => {
    await delay(250)
    const params = new URL(request.url).searchParams
    const check = checkRequest(
      request,
      params.get('customerId') === null ? undefined : Number(params.get('customerId')),
      params.get('amount') === null ? undefined : Number(params.get('amount')),
    )
    if (check.error) return check.error

    const { customer, amount } = check
    const calc = calculate(customer.id, amount)
    const balance = pointsByCustomer[customer.id]?.balance ?? 0
    const body: ConsumptionPreview = {
      customerId: customer.id,
      amount,
      ...calc,
      balanceBefore: balance,
      balanceAfter: balance + calc.totalPoints,
      equivalence: EQUIVALENCE,
      firstConsumptionBonus: FIRST_CONSUMPTION_BONUS,
    }
    return HttpResponse.json(body)
  }),

  http.post(`${API_URL}/consumos`, async ({ request }) => {
    await delay(400)
    const path = new URL(request.url).pathname
    const body = (await request.json()) as Record<string, unknown>

    // Equivalente al ValidationPipe con forbidNonWhitelisted: fecha, puntos, cajero y
    // equivalencia no se aceptan (CA-21.6)
    const extra = Object.keys(body).filter(
      (key) => key !== 'customerId' && key !== 'amount' && key !== 'notes',
    )
    if (extra.length) {
      return errorResponse(400, extra.map((key) => `property ${key} should not exist`), path)
    }
    if (typeof body.notes === 'string' && body.notes.length > 255) {
      return errorResponse(400, 'notes must be shorter than or equal to 255 characters', path)
    }

    const check = checkRequest(request, body.customerId, body.amount)
    if (check.error) return check.error

    const { account, customer, amount } = check
    const calc = calculate(customer.id, amount)
    const state = (pointsByCustomer[customer.id] ??= {
      balance: 0,
      lifetimePoints: 0,
      nextExpirations: [],
    })
    const balanceBefore = state.balance
    const levelBefore = levelOf(state.lifetimePoints).current

    // Los puntos primero cancelan la deuda; con lo que sobra se crea un lote (CA-21.5)
    const balanceAfter = balanceBefore + calc.totalPoints
    const leftover = balanceBefore < 0 ? Math.max(balanceAfter, 0) : calc.totalPoints
    state.balance = balanceAfter
    state.lifetimePoints += calc.totalPoints
    const createdAt = new Date()
    if (leftover > 0) {
      const expiresAt = new Date(createdAt)
      expiresAt.setUTCMonth(expiresAt.getUTCMonth() + 12)
      state.nextExpirations.push({ points: leftover, expiresAt })
      state.nextExpirations.sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime())
    }
    customersWithConsumption.add(customer.id)

    const id = nextConsumptionId++
    const code = codeOf(id)
    const levelAfter = levelOf(state.lifetimePoints).current
    const employee = { accountId: account.accountId, name: `${account.firstName} ${account.lastName}` }

    movementSeeds.push({
      customerId: customer.id,
      createdAt: createdAt.toISOString(),
      type: 'CONSUMPTION_CREDIT',
      points: calc.totalPoints,
      balanceAfter,
      description: `Consumo ${code}`,
      consumptionCode: code,
      reason: null,
      lot: null,
      performedBy: { actorType: 'EMPLOYEE', ...employee },
    })

    const consumption: Consumption = {
      id,
      code,
      createdAt: createdAt.toISOString(),
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        documentType: customer.documentType,
        documentNumber: customer.documentNumber,
      },
      amount,
      ...calc,
      equivalence: EQUIVALENCE,
      // Vacío se guarda como null
      notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
      status: 'REGISTERED',
      registeredBy: employee,
      voidedAt: null,
      voidedBy: null,
      voidReason: null,
      voidableUntil: new Date(createdAt.getTime() + DAY).toISOString(),
      canVoid: true,
    }
    const result: CreateConsumptionResult = {
      consumption,
      balanceBefore,
      balanceAfter,
      levelBefore,
      levelAfter,
      levelUp: levelBefore !== levelAfter,
    }
    return HttpResponse.json(result, { status: 201 })
  }),
]
