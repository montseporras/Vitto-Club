import { delay, http, HttpResponse } from 'msw'
import type {
  AuditAction,
  AuditActor,
  AuditEntry,
  AuditModule,
  AuditResponse,
} from '@/features/audit'
import { AUDIT_ACTIONS_BY_MODULE } from '@/features/audit'
import type { DocumentType } from '@/domain/documents'
import { API_URL } from '@/shared/api/http'

const SESSION_KEY = 'vitto:mock-session'
const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires'
const STATUS_NAMES = { 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden' }

const actors: AuditActor[] = [
  { accountId: 1, name: 'Ana Gómez', role: 'ADMIN', active: true },
  { accountId: 2, name: 'Bruno Pérez', role: 'CASHIER', active: true },
  { accountId: 3, name: 'Carla Martínez', role: 'CASHIER', active: true },
  { accountId: 4, name: 'Diego Sosa', role: 'CASHIER', active: false },
  { accountId: 6, name: 'Denise Nagel', role: 'ADMIN', active: true },
]

actors.sort((a, b) => {
  const lastNameA = a.name.split(' ').at(-1) ?? ''
  const lastNameB = b.name.split(' ').at(-1) ?? ''
  const collator = new Intl.Collator('es')
  return collator.compare(lastNameA, lastNameB) ||
    collator.compare(a.name, b.name) ||
    a.accountId - b.accountId
})

const carolina = {
  customerId: 102,
  name: 'Carolina Fernández',
  documentType: 'DNI' as const,
  documentNumber: '30111222',
}
const martin = {
  customerId: 104,
  name: 'Martín Gómez',
  documentType: 'DNI' as const,
  documentNumber: '41987654',
}
const sofia = {
  customerId: 108,
  name: 'Sofía Ríos',
  documentType: 'PASSPORT' as const,
  documentNumber: 'XC-8831',
}

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

const auditEntries: AuditEntry[] = [
  {
    id: 412,
    createdAt: minutesAgo(5),
    actorType: 'EMPLOYEE',
    actorAccountId: 1,
    performedBy: 'Ana Gómez',
    module: 'CONSUMPTIONS',
    action: 'CONSUMPTION_VOIDED',
    description: 'Anuló el consumo C-000131 de Martín Gómez',
    affectedCustomer: martin,
    operationCode: 'C-000131',
    details: [
      { label: 'Código de operación', value: 'C-000131' },
      { label: 'Monto', value: '$50.000' },
      { label: 'Puntos revertidos', value: '−500 pts' },
      { label: 'Saldo resultante', value: '-350 pts' },
      { label: 'Motivo', value: 'Consumo registrado al cliente equivocado.' },
    ],
  },
  {
    id: 411,
    createdAt: minutesAgo(5),
    actorType: 'SYSTEM',
    actorAccountId: null,
    performedBy: 'Sistema',
    module: 'POINTS',
    action: 'POINTS_EXPIRED',
    description: 'Venció 200 pts de Carolina Fernández',
    affectedCustomer: carolina,
    operationCode: null,
    details: [
      { label: 'Puntos vencidos', value: '−200 pts' },
      { label: 'Fecha del lote', value: '22/10/2025' },
      { label: 'Saldo resultante', value: '1.040 pts' },
    ],
  },
  {
    id: 410,
    createdAt: minutesAgo(35),
    actorType: 'EMPLOYEE',
    actorAccountId: 1,
    performedBy: 'Ana Gómez',
    module: 'EMPLOYEES',
    action: 'USER_ACCOUNT_REACTIVATED',
    description: 'Reactivó el usuario de Diego Sosa',
    affectedCustomer: null,
    operationCode: null,
    details: [{ label: 'Estado del usuario', value: 'Inactivo → Activo' }],
  },
  {
    id: 409,
    createdAt: minutesAgo(90),
    actorType: 'EMPLOYEE',
    actorAccountId: 2,
    performedBy: 'Bruno Pérez',
    module: 'CUSTOMERS',
    action: 'CUSTOMER_CREATED',
    description: 'Registró al cliente Sofía Ríos',
    affectedCustomer: sofia,
    operationCode: null,
    details: [
      { label: 'Tipo de documento', value: 'Pasaporte' },
      { label: 'Número de documento', value: 'XC-8831' },
    ],
  },
  {
    id: 408,
    createdAt: minutesAgo(160),
    actorType: 'EMPLOYEE',
    actorAccountId: 3,
    performedBy: 'Carla Martínez',
    module: 'CONSUMPTIONS',
    action: 'CONSUMPTION_REGISTERED',
    description: 'Registró el consumo C-000141 de Carolina Fernández',
    affectedCustomer: carolina,
    operationCode: 'C-000141',
    details: [
      { label: 'Código de operación', value: 'C-000141' },
      { label: 'Monto', value: '$50.000' },
      { label: 'Puntos acreditados', value: '+500 pts' },
      { label: 'Saldo resultante', value: '1.240 pts' },
    ],
  },
  {
    id: 407,
    createdAt: minutesAgo(260),
    actorType: 'EMPLOYEE',
    actorAccountId: 1,
    performedBy: 'Ana Gómez',
    module: 'CONFIGURATION',
    action: 'FIRST_CONSUMPTION_BONUS_UPDATED',
    description: 'Modificó la bonificación por primer consumo',
    affectedCustomer: null,
    operationCode: null,
    details: [
      { label: 'Bonificación anterior', value: '100 pts' },
      { label: 'Bonificación nueva', value: '150 pts' },
    ],
  },
  {
    id: 406,
    createdAt: minutesAgo(1_000),
    actorType: 'EMPLOYEE',
    actorAccountId: 1,
    performedBy: 'Ana Gómez',
    module: 'POINTS',
    action: 'POINTS_ADJUSTED',
    description: 'Ajustó puntos de Martín Gómez',
    affectedCustomer: martin,
    operationCode: null,
    details: [
      { label: 'Cantidad', value: '+100 pts' },
      { label: 'Saldo resultante', value: '800 pts' },
      { label: 'Motivo', value: 'Compensación por demora.' },
    ],
  },
  {
    id: 405,
    createdAt: minutesAgo(1_500),
    actorType: 'EMPLOYEE',
    actorAccountId: 4,
    performedBy: 'Diego Sosa',
    module: 'EMPLOYEES',
    action: 'USER_ACCOUNT_DEACTIVATED',
    description: 'Dio de baja el usuario de Diego Sosa',
    affectedCustomer: null,
    operationCode: null,
    details: [{ label: 'Estado del usuario', value: 'Activo → Inactivo' }],
  },
  {
    id: 404,
    createdAt: minutesAgo(2_000),
    actorType: 'EMPLOYEE',
    actorAccountId: 6,
    performedBy: 'Denise Nagel',
    module: 'CONFIGURATION',
    action: 'LEVELS_UPDATED',
    description: 'Modificó niveles',
    affectedCustomer: null,
    operationCode: null,
    details: [
      { label: 'Nivel Plata', value: '300 → 400 pts' },
      { label: 'Nivel Oro', value: '800 → 900 pts' },
    ],
  },
  {
    id: 403,
    createdAt: minutesAgo(2_500),
    actorType: 'EMPLOYEE',
    actorAccountId: 2,
    performedBy: 'Bruno Pérez',
    module: 'CUSTOMERS',
    action: 'CUSTOMER_UPDATED',
    description: 'Editó los datos del cliente Carolina Fernández',
    affectedCustomer: carolina,
    operationCode: null,
    details: [
      { label: 'Teléfono', value: '3510000001 → 3510000009' },
    ],
  },
  {
    id: 402,
    createdAt: minutesAgo(3_000),
    actorType: 'EMPLOYEE',
    actorAccountId: 3,
    performedBy: 'Carla Martínez',
    module: 'REDEMPTIONS',
    action: 'REDEMPTION_USED',
    description: 'Registró el uso del canje de Sofía Ríos',
    affectedCustomer: sofia,
    operationCode: 'CJ-00412',
    details: [
      { label: 'Recompensa', value: 'Postre a elección' },
      { label: 'Código del canje', value: 'CJ-00412' },
      { label: 'Puntos descontados', value: '−300 pts' },
    ],
  },
  {
    id: 401,
    createdAt: minutesAgo(4_000),
    actorType: 'EMPLOYEE',
    actorAccountId: 1,
    performedBy: 'Ana Gómez',
    module: 'EMPLOYEES',
    action: 'EMPLOYEE_UPDATED',
    description: 'Editó al empleado Diego Sosa',
    affectedCustomer: null,
    operationCode: null,
    details: [{ label: 'Teléfono', value: '— → 3510000004' }],
  },
]

const AUDIT_MODULE_VALUES = new Set<AuditModule>(
  Object.keys(AUDIT_ACTIONS_BY_MODULE) as AuditModule[],
)
const AUDIT_ACTION_VALUES = new Set(
  Object.values(AUDIT_ACTIONS_BY_MODULE)
    .flat()
    .map(({ value }) => value),
)
const ALLOWED_AUDIT_PARAMS = new Set([
  'actor',
  'module',
  'action',
  'documentType',
  'documentNumber',
  'fromDate',
  'toDate',
  'date',
  'operationCode',
  'page',
  'limit',
])
const VALID_DOCUMENT_TYPES = new Set<DocumentType>(['DNI', 'PASSPORT'])

const errorResponse = (
  statusCode: 400 | 401 | 403,
  message: string,
  request: Request,
  details?: { field: string; message: string }[],
  code?: string,
) => {
  const { pathname, search } = new URL(request.url)
  return HttpResponse.json(
    {
      statusCode,
      error: STATUS_NAMES[statusCode],
      message,
      path: pathname + search,
      timestamp: new Date().toISOString(),
      ...(details ? { details } : {}),
      ...(code ? { code } : {}),
    },
    { status: statusCode },
  )
}

function forbiddenOrUnauthenticated(request: Request) {
  const accountId = sessionStorage.getItem(SESSION_KEY)
  if (!accountId) {
    return errorResponse(
      401,
      'La sesión no es válida.',
      request,
      undefined,
      'UNAUTHENTICATED',
    )
  }
  if (accountId !== '1') {
    return errorResponse(
      403,
      'No tenés permiso para consultar la auditoría.',
      request,
      undefined,
      'FORBIDDEN',
    )
  }
  return null
}

function badRequest(request: Request, field: string, message: string) {
  return errorResponse(400, message, request, [{ field, message }])
}

function normalizeDocumentNumber(value: string) {
  return value.replace(/[.\s-]/g, '').toUpperCase()
}

function validIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function dateInArgentina(value: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ARGENTINA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value))
  const fields = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]))
  return `${fields.year}-${fields.month}-${fields.day}`
}

function auditQueryError(searchParams: URLSearchParams, request: Request) {
  for (const key of searchParams.keys()) {
    if (!ALLOWED_AUDIT_PARAMS.has(key)) {
      return badRequest(request, key, 'El parámetro no está permitido.')
    }
  }

  const actor = searchParams.get('actor')
  if (actor && actor !== 'SYSTEM' && !/^[1-9]\d*$/.test(actor)) {
    return badRequest(request, 'actor', 'El actor no es válido.')
  }

  const module = searchParams.get('module')
  if (module && !AUDIT_MODULE_VALUES.has(module as AuditModule)) {
    return badRequest(request, 'module', 'El módulo no es válido.')
  }

  const action = searchParams.get('action')
  if (action) {
    if (!module) {
      return badRequest(request, 'action', 'La acción requiere un módulo.')
    }
    const actionExists = AUDIT_ACTION_VALUES.has(action as AuditAction)
    const actionBelongsToModule = AUDIT_ACTIONS_BY_MODULE[
      module as AuditModule
    ].some((item) => item.value === action)
    if (!actionExists || !actionBelongsToModule) {
      return badRequest(request, 'action', 'La acción no pertenece al módulo.')
    }
  }

  const documentType =
    searchParams.get('documentType') ??
    (searchParams.has('documentNumber') ? 'DNI' : null)
  if (documentType && !VALID_DOCUMENT_TYPES.has(documentType as DocumentType)) {
    return badRequest(request, 'documentType', 'El tipo de documento no es válido.')
  }

  const rawDocumentNumber = searchParams.get('documentNumber')
  if (rawDocumentNumber !== null) {
    if (rawDocumentNumber.length > 20) {
      return badRequest(request, 'documentNumber', 'El número de documento es demasiado largo.')
    }
    if (!normalizeDocumentNumber(rawDocumentNumber)) {
      return badRequest(request, 'documentNumber', 'El número de documento no es válido.')
    }
  }

  const fromDate = searchParams.get('fromDate')
  const toDate = searchParams.get('toDate')
  const date = searchParams.get('date')
  if (date && (fromDate || toDate)) {
    return badRequest(request, 'date', 'No se puede combinar fecha exacta y rango.')
  }
  for (const [field, value] of [
    ['fromDate', fromDate],
    ['toDate', toDate],
    ['date', date],
  ] as const) {
    if (value && !validIsoDate(value)) {
      return badRequest(request, field, 'La fecha no es válida.')
    }
  }
  if (fromDate && toDate && fromDate > toDate) {
    return badRequest(request, 'fromDate', 'El rango de fechas no es válido.')
  }

  const page = searchParams.get('page')
  if (page && (!/^[1-9]\d*$/.test(page) || !Number.isSafeInteger(Number(page)))) {
    return badRequest(request, 'page', 'La página no es válida.')
  }
  const limit = searchParams.get('limit')
  if (
    limit &&
    (!/^\d+$/.test(limit) || Number(limit) < 1 || Number(limit) > 100)
  ) {
    return badRequest(request, 'limit', 'El límite no es válido.')
  }
  const operationCode = searchParams.get('operationCode')
  if (operationCode && operationCode.length > 20) {
    return badRequest(request, 'operationCode', 'El código de operación es demasiado largo.')
  }
  return null
}

function matchesQuery(entry: AuditEntry, searchParams: URLSearchParams) {
  const actor = searchParams.get('actor')
  if (actor === 'SYSTEM' && entry.actorType !== 'SYSTEM') return false
  if (actor && actor !== 'SYSTEM' && entry.actorAccountId !== Number(actor)) return false

  const module = searchParams.get('module')
  if (module && entry.module !== module) return false
  const action = searchParams.get('action')
  if (action && entry.action !== action) return false

  const documentType =
    searchParams.get('documentType') ??
    (searchParams.has('documentNumber') ? 'DNI' : null)
  if (documentType && entry.affectedCustomer?.documentType !== documentType) return false
  const documentNumber = searchParams.get('documentNumber')
  if (
    documentNumber &&
    !normalizeDocumentNumber(entry.affectedCustomer?.documentNumber ?? '').includes(
      normalizeDocumentNumber(documentNumber),
    )
  ) {
    return false
  }

  const entryDate = dateInArgentina(entry.createdAt)
  const date = searchParams.get('date')
  if (date && entryDate !== date) return false
  const fromDate = searchParams.get('fromDate')
  if (fromDate && entryDate < fromDate) return false
  const toDate = searchParams.get('toDate')
  if (toDate && entryDate > toDate) return false

  const operationCode = searchParams.get('operationCode')
  if (
    operationCode &&
    entry.operationCode?.toLocaleLowerCase('es') !==
      operationCode.toLocaleLowerCase('es')
  ) {
    return false
  }
  return true
}

export const auditHandlers = [
  http.get(`${API_URL}/auditoria/actores`, async ({ request }) => {
    await delay(250)
    const accessError = forbiddenOrUnauthenticated(request)
    if (accessError) return accessError
    const { searchParams } = new URL(request.url)
    const unexpectedParameter = searchParams.keys().next().value
    if (unexpectedParameter) {
      return badRequest(request, unexpectedParameter, 'El parámetro no está permitido.')
    }
    return HttpResponse.json(actors)
  }),
  http.get(`${API_URL}/auditoria`, async ({ request }) => {
    await delay(350)
    const accessError = forbiddenOrUnauthenticated(request)
    if (accessError) return accessError

    const { searchParams } = new URL(request.url)
    const validationError = auditQueryError(searchParams, request)
    if (validationError) return validationError

    const filtered = auditEntries
      .filter((entry) => matchesQuery(entry, searchParams))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
    const page = Number(searchParams.get('page') ?? 1)
    const limit = Number(searchParams.get('limit') ?? 20)
    const start = (page - 1) * limit
    const response: AuditResponse = {
      items: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      limit,
    }
    return HttpResponse.json(response)
  }),
]
