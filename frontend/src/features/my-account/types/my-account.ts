import type { DocumentType } from '@/domain/documents'
import type { Level } from '@/domain/levels'

/** GET y PATCH /customers/me (contrato §3.10.3). Sin `active` ni `deactivatedAt`. */
export type MyProfile = {
  id: number
  firstName: string
  lastName: string
  documentType: DocumentType
  documentNumber: string
  email: string
  phone: string | null
  /** 'YYYY-MM-DD' */
  dateOfBirth: string | null
  /** ISO UTC */
  createdAt: string
}

/**
 * Body de PATCH /customers/me (§3.10.4): solo lo que cambió, al menos un campo.
 * `null` borra el teléfono o la fecha. `currentPassword` va solo si cambia el correo.
 */
export type UpdateMyProfileBody = {
  phone?: string | null
  email?: string
  currentPassword?: string
  dateOfBirth?: string | null
}

/** Body de PATCH /mi-cuenta/password (§3.11.1). La confirmación no viaja. */
export type ChangePasswordBody = {
  currentPassword: string
  newPassword: string
}

/** GET /customers/me/puntos: misma forma que /customers/:id/puntos (§3.4.1). */
export type MyPoints = {
  customerId: number
  balance: number
  negativeBalance: boolean
  lifetimePoints: number
  level: {
    current: Level
    next: Level | null
    currentMinPoints: number
    nextMinPoints: number | null
    pointsToNext: number
    progressPercent: number
    /** Texto informativo del nivel actual (NIV-BEN, S5 §3.10); null si no tiene. */
    benefit: string | null
    /** Texto informativo del nivel siguiente; null si no tiene o ya está en Oro. */
    nextBenefit: string | null
  }
  nextExpirations: { points: number; expiresAt: string }[]
}

export type CustomerMissionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CLAIMED' | 'EXPIRED'
export type CustomerMissionObjectiveType = 'CONSUMPTION_COUNT' | 'CONSUMPTION_AMOUNT'
export type CustomerMissionClaimedBy = 'CUSTOMER' | 'SYSTEM'

/** CustomerMission de las rutas del Cliente (contrato §3.3.1). */
export type CustomerMission = {
  id: number
  mission: { id: number; name: string; description: string | null }
  period: string
  objectiveType: CustomerMissionObjectiveType
  target: number
  daysOfWeek: number[] | null
  timeFrom: string | null
  timeTo: string | null
  rewardPoints: number | null
  progress: number
  status: CustomerMissionStatus
  completedAt: string | null
  claimedAt: string | null
  claimedBy: CustomerMissionClaimedBy | null
  canClaim: boolean
  endsAt: string
}

/** PATCH /customers/me/misiones/:id/reclamar (§3.3.3). */
export type ClaimMissionRewardResult = {
  customerMission: CustomerMission
  balanceAfter: number
}

/** Códigos de error de Mi perfil: las decisiones se toman por estos, nunca por el mensaje. */
export const MY_ACCOUNT_ERROR_CODES = {
  CURRENT_PASSWORD_INCORRECT: 'CURRENT_PASSWORD_INCORRECT',
  PASSWORD_SAME_AS_CURRENT: 'PASSWORD_SAME_AS_CURRENT',
  PASSWORD_SAME_AS_DOCUMENT: 'PASSWORD_SAME_AS_DOCUMENT',
  EMAIL_IN_USE: 'EMAIL_IN_USE',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
} as const
