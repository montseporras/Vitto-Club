import { delay, http, HttpResponse } from 'msw'
import type {
  CompletedMission,
  CreateMissionBody,
  Mission,
  MissionListOrder,
  MissionPhase,
  UpdateMissionBody,
} from '@/features/missions'
import { addMonths, monthKeyInArgentina } from '@/features/missions'
import { API_URL } from '@/shared/api/http'
import { accountFromRequest } from './auth.handlers'
import { errorResponse } from './cashier.handlers'

const currentMonth = monthKeyInArgentina()
const now = new Date()
const timestamp = now.toISOString()

const missionSeeds: Mission[] = [
  {
    id: 1,
    name: 'Vení 3 veces',
    description: 'Sumá 3 consumos en el mes y ganá 50 puntos.',
    objectiveType: 'CONSUMPTION_COUNT',
    target: 3,
    daysOfWeek: null,
    timeFrom: null,
    timeTo: null,
    rewardPoints: 50,
    startMonth: currentMonth,
    endMonth: null,
    status: 'ACTIVE',
    phase: 'RUNNING',
    pendingChanges: null,
    completedCount: 1,
    createdAt: new Date(now.getTime() - 3 * 86_400_000).toISOString(),
    updatedAt: timestamp,
  },
  {
    id: 2,
    name: 'Merienda de los domingos',
    description: null,
    objectiveType: 'CONSUMPTION_AMOUNT',
    target: 20_000,
    daysOfWeek: [7],
    timeFrom: '09:00',
    timeTo: '13:00',
    rewardPoints: null,
    startMonth: addMonths(currentMonth, 1),
    endMonth: addMonths(currentMonth, 2),
    status: 'ACTIVE',
    phase: 'UPCOMING',
    pendingChanges: null,
    completedCount: 0,
    createdAt: new Date(now.getTime() - 2 * 86_400_000).toISOString(),
    updatedAt: timestamp,
  },
  {
    id: 3,
    name: 'Objetivo de prueba finalizado',
    description: null,
    objectiveType: 'CONSUMPTION_COUNT',
    target: 2,
    daysOfWeek: [4],
    timeFrom: null,
    timeTo: null,
    rewardPoints: 80,
    startMonth: addMonths(currentMonth, -2),
    endMonth: addMonths(currentMonth, -1),
    status: 'ACTIVE',
    phase: 'FINISHED',
    pendingChanges: null,
    completedCount: 0,
    createdAt: new Date(now.getTime() - 86_400_000).toISOString(),
    updatedAt: timestamp,
  },
]

const completedSeed: CompletedMission[] = [
  {
    customerMissionId: 41,
    customer: {
      id: 1,
      firstName: 'Lucía',
      lastName: 'Fernández',
      documentType: 'DNI',
      documentNumber: '40123456',
    },
    status: 'COMPLETED',
    completedAt: new Date(now.getTime() - 2 * 86_400_000).toISOString(),
    claimedAt: null,
    claimedBy: null,
    rewardPoints: 50,
  },
]

const allowedListParams = new Set(['q', 'phase', 'order', 'page', 'limit'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-AR')
}

function getPhase(mission: Mission): MissionPhase {
  if (mission.startMonth > currentMonth) return 'UPCOMING'
  if (mission.endMonth && mission.endMonth < currentMonth) return 'FINISHED'
  return 'RUNNING'
}

function activeMission(id: number) {
  return missionSeeds.find((mission) => mission.id === id && mission.status !== 'DELETED')
}

function missionHasAssignmentsThisMonth(id: number) {
  return id === 1
}

function validRole(request: Request, path: string) {
  const account = accountFromRequest(request)
  if (!account) {
    return errorResponse(401, 'Token inválido o vencido.', path, 'UNAUTHENTICATED')
  }
  if (account.role !== 'ADMIN') {
    return errorResponse(403, 'No tenés permiso para realizar esta acción.', path, 'FORBIDDEN')
  }
  return null
}

function validPageParams(url: URL, path: string) {
  const requestedPage = Number(url.searchParams.get('page') ?? '1')
  const requestedLimit = Number(url.searchParams.get('limit') ?? '10')
  if (!Number.isInteger(requestedPage) || requestedPage < 1) {
    return { error: errorResponse(400, 'page must not be less than 1', path) }
  }
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 100) {
    return { error: errorResponse(400, 'limit must be between 1 and 100', path) }
  }
  return { page: requestedPage, limit: requestedLimit }
}

function isValidMonth(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

function isMissionPhase(value: string): value is MissionPhase {
  return value === 'RUNNING' || value === 'UPCOMING' || value === 'FINISHED'
}

function isMissionListOrder(value: string): value is MissionListOrder {
  return value === 'RECENT' || value === 'OLDEST'
}

function isMissionObjectiveType(value: unknown): value is Mission['objectiveType'] {
  return value === 'CONSUMPTION_COUNT' || value === 'CONSUMPTION_AMOUNT'
}

function isMissionDays(value: unknown): value is number[] | null {
  return (
    value === null ||
    (Array.isArray(value) &&
      value.length > 0 &&
      value.every(
        (day) => typeof day === 'number' && Number.isInteger(day) && day >= 1 && day <= 7,
      ) &&
      new Set(value).size === value.length)
  )
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function sameDays(left: number[] | null, right: number[] | null) {
  if (left === null || right === null) return left === right
  const sortedLeft = left.slice().sort((a, b) => a - b)
  const sortedRight = right.slice().sort((a, b) => a - b)
  return (
    sortedLeft.length === sortedRight.length &&
    sortedLeft.every((day, index) => day === sortedRight[index])
  )
}

export const missionsHandlers = [
  http.get(`${API_URL}/misiones`, async ({ request }) => {
    await delay(250)
    const url = new URL(request.url)
    const path = url.pathname
    const roleError = validRole(request, path)
    if (roleError) return roleError

    const unknownParam = [...url.searchParams.keys()].find(
      (key) => !allowedListParams.has(key),
    )
    if (unknownParam) {
      return errorResponse(400, `property ${unknownParam} should not exist`, path)
    }

    const q = url.searchParams.get('q') ?? ''
    if (q.length > 80) return errorResponse(400, 'q must be shorter than or equal to 80 characters', path)

    const requestedPhase = url.searchParams.get('phase') ?? ''
    if (requestedPhase && !isMissionPhase(requestedPhase)) {
      return errorResponse(400, 'phase must be one of the following values: RUNNING, UPCOMING, FINISHED', path)
    }

    const order = url.searchParams.get('order') ?? 'RECENT'
    if (!isMissionListOrder(order)) {
      return errorResponse(400, 'order must be one of the following values: RECENT, OLDEST', path)
    }

    const paging = validPageParams(url, path)
    if ('error' in paging) return paging.error

    const search = normalizeSearch(q)
    const filtered = missionSeeds
      .filter((mission) => mission.status !== 'DELETED')
      .map((mission) => {
        const completedCount = mission.id === 1 && currentMonth === monthKeyInArgentina() ? 1 : 0
        return { ...mission, phase: getPhase(mission), completedCount }
      })
      .filter((mission) => !requestedPhase || mission.phase === requestedPhase)
      .filter((mission) => !search || normalizeSearch(mission.name).includes(search))
      .sort((left, right) =>
        order === 'OLDEST'
          ? Date.parse(left.createdAt) - Date.parse(right.createdAt)
          : Date.parse(right.createdAt) - Date.parse(left.createdAt),
      )
    const items = filtered.slice((paging.page - 1) * paging.limit, paging.page * paging.limit)

    return HttpResponse.json({
      items,
      total: filtered.length,
      page: paging.page,
      limit: paging.limit,
    })
  }),

  http.post(`${API_URL}/misiones`, async ({ request }) => {
    await delay(300)
    const path = new URL(request.url).pathname
    const roleError = validRole(request, path)
    if (roleError) return roleError

    const bodyValue: unknown = await request.json()
    if (!isRecord(bodyValue)) {
      return errorResponse(400, 'El cuerpo de la solicitud no es válido.', path)
    }
    const allowedFields = [
      'name',
      'description',
      'objectiveType',
      'target',
      'daysOfWeek',
      'timeFrom',
      'timeTo',
      'rewardPoints',
      'startMonth',
      'endMonth',
    ]
    const extraField = Object.keys(bodyValue).find((field) => !allowedFields.includes(field))
    if (extraField) {
      return errorResponse(400, `property ${extraField} should not exist`, path)
    }
    if (allowedFields.some((field) => !Object.hasOwn(bodyValue, field))) {
      return errorResponse(400, 'El cuerpo de la solicitud no es válido.', path)
    }

    if (typeof bodyValue.name !== 'string' || !bodyValue.name.trim()) {
      return errorResponse(400, 'El nombre es obligatorio.', path)
    }
    const name = bodyValue.name.trim()
    if (name.length > 80) {
      return errorResponse(400, 'El nombre no puede superar los 80 caracteres.', path)
    }
    if (
      bodyValue.description !== null &&
      typeof bodyValue.description !== 'string'
    ) {
      return errorResponse(400, 'description must be a string', path)
    }
    const description =
      typeof bodyValue.description === 'string' ? bodyValue.description.trim() : ''
    if (description.length > 255) {
      return errorResponse(400, 'La descripción no puede superar los 255 caracteres.', path)
    }

    const objectiveType = bodyValue.objectiveType
    if (!isMissionObjectiveType(objectiveType)) {
      return errorResponse(400, 'objectiveType must be a valid enum value', path)
    }
    const target = bodyValue.target
    if (typeof target !== 'number' || target <= 0) {
      return errorResponse(400, 'Ingresá un objetivo mayor a 0.', path)
    }
    const maximum = objectiveType === 'CONSUMPTION_COUNT' ? 100 : 1_000_000
    if (target > maximum) {
      return errorResponse(
        400,
        `El objetivo máximo es ${maximum.toLocaleString('es-AR')}.`,
        path,
      )
    }
    if (objectiveType === 'CONSUMPTION_COUNT' && !Number.isInteger(target)) {
      return errorResponse(400, 'Ingresá un número entero.', path)
    }

    const daysOfWeek = bodyValue.daysOfWeek
    if (!isMissionDays(daysOfWeek)) {
      return errorResponse(400, 'Elegí al menos un día o marcá «Todos los días».', path)
    }
    const timeFrom = bodyValue.timeFrom
    const timeTo = bodyValue.timeTo
    if (
      !isNullableString(timeFrom) ||
      !isNullableString(timeTo)
    ) {
      return errorResponse(400, 'Completá las dos horas o ninguna.', path)
    }
    if (Boolean(timeFrom) !== Boolean(timeTo)) {
      return errorResponse(400, 'Completá las dos horas o ninguna.', path)
    }
    if (
      typeof timeFrom === 'string' &&
      typeof timeTo === 'string' &&
      timeFrom >= timeTo
    ) {
      return errorResponse(400, 'La hora de inicio tiene que ser anterior a la de fin.', path)
    }

    const rewardPoints = bodyValue.rewardPoints
    if (
      rewardPoints !== null &&
      (typeof rewardPoints !== 'number' ||
        !Number.isInteger(rewardPoints) ||
        rewardPoints < 1)
    ) {
      return errorResponse(400, 'Ingresá puntos enteros mayores a 0.', path)
    }
    if (typeof rewardPoints === 'number' && rewardPoints > 100_000) {
      return errorResponse(400, 'El máximo es 100.000 puntos.', path)
    }

    const startMonth = bodyValue.startMonth
    if (typeof startMonth !== 'string' || !isValidMonth(startMonth)) {
      return errorResponse(400, 'El mes de inicio no puede ser anterior al mes actual.', path)
    }
    if (startMonth < currentMonth) {
      return errorResponse(400, 'El mes de inicio no puede ser anterior al mes actual.', path)
    }
    const endMonth = bodyValue.endMonth
    if (!isNullableString(endMonth)) {
      return errorResponse(400, 'El mes de fin no puede ser anterior al de inicio.', path)
    }
    if (
      typeof endMonth === 'string' &&
      (!isValidMonth(endMonth) || endMonth < startMonth)
    ) {
      return errorResponse(400, 'El mes de fin no puede ser anterior al de inicio.', path)
    }

    const duplicate = missionSeeds.some(
      (mission) =>
        mission.status !== 'DELETED' &&
        mission.name.trim().toLocaleLowerCase('es-AR') === name.toLocaleLowerCase('es-AR'),
    )
    if (duplicate) {
      return errorResponse(
        409,
        'Ya existe una misión con ese nombre.',
        path,
        'MISSION_NAME_IN_USE',
      )
    }

    const body: CreateMissionBody = {
      name,
      description,
      objectiveType,
      target,
      daysOfWeek,
      timeFrom,
      timeTo,
      rewardPoints,
      startMonth,
      endMonth,
    }
    const createdAt = new Date().toISOString()
    const mission: Mission = {
      id: Math.max(0, ...missionSeeds.map((item) => item.id)) + 1,
      name: body.name,
      description: body.description || null,
      objectiveType: body.objectiveType,
      target: body.target,
      daysOfWeek: body.daysOfWeek,
      timeFrom: body.timeFrom,
      timeTo: body.timeTo,
      rewardPoints: body.rewardPoints,
      startMonth: body.startMonth,
      endMonth: body.endMonth,
      status: 'ACTIVE',
      phase:
        body.startMonth > currentMonth
          ? 'UPCOMING'
          : body.endMonth && body.endMonth < currentMonth
            ? 'FINISHED'
            : 'RUNNING',
      pendingChanges: null,
      completedCount: 0,
      createdAt,
      updatedAt: createdAt,
    }
    missionSeeds.unshift(mission)
    return HttpResponse.json(mission, { status: 201 })
  }),

  http.patch(`${API_URL}/misiones/:id`, async ({ params, request }) => {
    await delay(300)
    const path = new URL(request.url).pathname
    const roleError = validRole(request, path)
    if (roleError) return roleError

    const mission = activeMission(Number(params.id))
    if (!mission) return errorResponse(404, 'No existe la misión.', path)

    const bodyValue: unknown = await request.json()
    if (!isRecord(bodyValue)) {
      return errorResponse(400, 'El cuerpo de la solicitud no es válido.', path)
    }

    const allowedFields = [
      'name',
      'description',
      'objectiveType',
      'target',
      'daysOfWeek',
      'timeFrom',
      'timeTo',
      'rewardPoints',
      'startMonth',
      'endMonth',
    ]
    const extraField = Object.keys(bodyValue).find((field) => !allowedFields.includes(field))
    if (extraField) {
      return errorResponse(400, `property ${extraField} should not exist`, path)
    }
    if (Object.keys(bodyValue).length === 0) {
      return errorResponse(400, 'Modificá al menos un dato.', path)
    }

    const body = bodyValue as UpdateMissionBody
    let name = mission.name
    let description = mission.description
    let startMonth = mission.startMonth
    let endMonth = mission.endMonth
    if (Object.hasOwn(body, 'name')) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        return errorResponse(400, 'El nombre es obligatorio.', path)
      }
      if (body.name.trim().length > 80) {
        return errorResponse(400, 'El nombre no puede superar los 80 caracteres.', path)
      }
      const duplicate = missionSeeds.some(
        (item) =>
          item.id !== mission.id &&
          item.status !== 'DELETED' &&
          item.name.trim().toLocaleLowerCase('es-AR') ===
            body.name?.trim().toLocaleLowerCase('es-AR'),
      )
      if (duplicate) {
        return errorResponse(
          409,
          'Ya existe una misión con ese nombre.',
          path,
          'MISSION_NAME_IN_USE',
        )
      }
      name = body.name.trim()
    }

    if (Object.hasOwn(body, 'description')) {
      if (typeof body.description !== 'string') {
        return errorResponse(400, 'description must be a string', path)
      }
      if (body.description.length > 255) {
        return errorResponse(400, 'La descripción no puede superar los 255 caracteres.', path)
      }
      description = body.description.trim() || null
    }

    const effective = mission.pendingChanges ?? mission
    const nextObjectiveType = body.objectiveType ?? effective.objectiveType
    const nextTarget = body.target ?? effective.target
    const nextDays = Object.hasOwn(body, 'daysOfWeek')
      ? body.daysOfWeek ?? null
      : effective.daysOfWeek
    const nextTimeFrom = Object.hasOwn(body, 'timeFrom')
      ? body.timeFrom ?? null
      : effective.timeFrom
    const nextTimeTo = Object.hasOwn(body, 'timeTo') ? body.timeTo ?? null : effective.timeTo
    const nextRewardPoints = Object.hasOwn(body, 'rewardPoints')
      ? body.rewardPoints ?? null
      : effective.rewardPoints

    if (
      Object.hasOwn(body, 'objectiveType') &&
      !isMissionObjectiveType(body.objectiveType)
    ) {
      return errorResponse(400, 'objectiveType must be a valid enum value', path)
    }
    if (Object.hasOwn(body, 'target')) {
      if (typeof body.target !== 'number' || body.target <= 0) {
        return errorResponse(400, 'Ingresá un objetivo mayor a 0.', path)
      }
      const maximum = nextObjectiveType === 'CONSUMPTION_COUNT' ? 100 : 1_000_000
      if (body.target > maximum) {
        return errorResponse(400, `El objetivo máximo es ${maximum.toLocaleString('es-AR')}.`, path)
      }
      if (nextObjectiveType === 'CONSUMPTION_COUNT' && !Number.isInteger(body.target)) {
        return errorResponse(400, 'Ingresá un número entero.', path)
      }
    }
    if (
      Object.hasOwn(body, 'daysOfWeek') &&
      !isMissionDays(body.daysOfWeek)
    ) {
      return errorResponse(400, 'Elegí al menos un día o marcá «Todos los días».', path)
    }
    if (
      !isNullableString(nextTimeFrom) ||
      !isNullableString(nextTimeTo) ||
      Boolean(nextTimeFrom) !== Boolean(nextTimeTo)
    ) {
      return errorResponse(400, 'Completá las dos horas o ninguna.', path)
    }
    if (
      typeof nextTimeFrom === 'string' &&
      typeof nextTimeTo === 'string' &&
      nextTimeFrom >= nextTimeTo
    ) {
      return errorResponse(400, 'La hora de inicio tiene que ser anterior a la de fin.', path)
    }
    if (
      Object.hasOwn(body, 'rewardPoints') &&
      body.rewardPoints !== null &&
      (typeof body.rewardPoints !== 'number' ||
        !Number.isInteger(body.rewardPoints) ||
        body.rewardPoints < 1)
    ) {
      return errorResponse(400, 'Ingresá puntos enteros mayores a 0.', path)
    }
    if (typeof body.rewardPoints === 'number' && body.rewardPoints > 100_000) {
      return errorResponse(400, 'El máximo es 100.000 puntos.', path)
    }

    if (Object.hasOwn(body, 'startMonth')) {
      if (typeof body.startMonth !== 'string' || !isValidMonth(body.startMonth)) {
        return errorResponse(400, 'El mes de inicio no puede ser anterior al mes actual.', path)
      }
      if (
        mission.startMonth <= currentMonth &&
        body.startMonth !== mission.startMonth
      ) {
        return errorResponse(
          400,
          'La misión ya empezó: no se puede cambiar el mes de inicio.',
          path,
        )
      }
      startMonth = body.startMonth
    }

    if (Object.hasOwn(body, 'endMonth')) {
      if (!isNullableString(body.endMonth)) {
        return errorResponse(400, 'El mes de fin no puede ser anterior al de inicio.', path)
      }
      if (
        typeof body.endMonth === 'string' &&
        (!isValidMonth(body.endMonth) || body.endMonth < startMonth)
      ) {
        return errorResponse(400, 'El mes de fin no puede ser anterior al de inicio.', path)
      }
      endMonth = body.endMonth
    }

    mission.name = name
    mission.description = description
    mission.startMonth = startMonth
    mission.endMonth = endMonth

    const objectiveChanged =
      (Object.hasOwn(body, 'objectiveType') &&
        nextObjectiveType !== effective.objectiveType) ||
      (Object.hasOwn(body, 'target') && nextTarget !== effective.target) ||
      (Object.hasOwn(body, 'daysOfWeek') && !sameDays(nextDays, effective.daysOfWeek)) ||
      (Object.hasOwn(body, 'timeFrom') && nextTimeFrom !== effective.timeFrom) ||
      (Object.hasOwn(body, 'timeTo') && nextTimeTo !== effective.timeTo) ||
      (Object.hasOwn(body, 'rewardPoints') && nextRewardPoints !== effective.rewardPoints)

    let appliesFrom: string | null = null
    if (objectiveChanged && missionHasAssignmentsThisMonth(mission.id)) {
      appliesFrom = addMonths(currentMonth, 1)
      mission.pendingChanges = {
        appliesFrom,
        objectiveType: nextObjectiveType,
        target: nextTarget,
        daysOfWeek: nextDays,
        timeFrom: nextTimeFrom,
        timeTo: nextTimeTo,
        rewardPoints: nextRewardPoints,
      }
    } else if (objectiveChanged) {
      mission.objectiveType = nextObjectiveType
      mission.target = nextTarget
      mission.daysOfWeek = nextDays
      mission.timeFrom = nextTimeFrom
      mission.timeTo = nextTimeTo
      mission.rewardPoints = nextRewardPoints
      mission.pendingChanges = null
    }

    mission.phase = getPhase(mission)
    mission.updatedAt = new Date().toISOString()
    return HttpResponse.json({ mission: { ...mission }, appliesFrom })
  }),

  http.patch(`${API_URL}/misiones/:id/eliminar`, async ({ params, request }) => {
    await delay(300)
    const path = new URL(request.url).pathname
    const roleError = validRole(request, path)
    if (roleError) return roleError

    const mission = activeMission(Number(params.id))
    if (!mission) return errorResponse(404, 'No existe la misión.', path)

    const assignedInProgress = missionHasAssignmentsThisMonth(mission.id) ? 1 : 0
    const completedWithReward =
      mission.id === 1
        ? completedSeed.filter(
            (completion) =>
              completion.status === 'COMPLETED' && completion.rewardPoints !== null,
          )
        : []
    const claimedAt = new Date().toISOString()
    for (const completion of completedWithReward) {
      const index = completedSeed.indexOf(completion)
      completedSeed[index] = {
        ...completion,
        status: 'CLAIMED',
        claimedAt,
        claimedBy: 'SYSTEM',
      }
    }

    mission.status = 'DELETED'
    mission.updatedAt = claimedAt
    return HttpResponse.json({
      expired: assignedInProgress,
      claimed: completedWithReward.length,
    })
  }),

  http.get(`${API_URL}/misiones/:id/completadas`, async ({ params, request }) => {
    await delay(200)
    const path = new URL(request.url).pathname
    const roleError = validRole(request, path)
    if (roleError) return roleError

    const id = Number(params.id)
    const mission = activeMission(id)
    if (!mission) return errorResponse(404, 'No existe la misión.', path)

    const url = new URL(request.url)
    const unknownParam = [...url.searchParams.keys()].find((key) => key !== 'period')
    if (unknownParam) {
      return errorResponse(400, `property ${unknownParam} should not exist`, path)
    }
    const period = url.searchParams.get('period') ?? currentMonth
    if (
      !isValidMonth(period) ||
      period > currentMonth ||
      period < addMonths(currentMonth, -11)
    ) {
      return errorResponse(400, 'Elegí un mes de los últimos 12.', path)
    }

    return HttpResponse.json(
      id === 1 && period === currentMonth ? completedSeed : [],
    )
  }),

  http.get(`${API_URL}/misiones/:id`, async ({ params, request }) => {
    await delay(200)
    const path = new URL(request.url).pathname
    const roleError = validRole(request, path)
    if (roleError) return roleError

    const url = new URL(request.url)
    const unknownParam = [...url.searchParams.keys()][0]
    if (unknownParam) {
      return errorResponse(400, `property ${unknownParam} should not exist`, path)
    }

    const mission = activeMission(Number(params.id))
    if (!mission) return errorResponse(404, 'No existe la misión.', path)
    const completedCount =
      Number(params.id) === 1 && mission.startMonth <= currentMonth ? completedSeed.length : 0
    return HttpResponse.json({ ...mission, phase: getPhase(mission), completedCount })
  }),
]
