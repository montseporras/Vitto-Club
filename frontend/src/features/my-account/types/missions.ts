// Misiones del Cliente: forma de `GET /customers/me/misiones` (contrato S5 §3.3.1 y §3.3.2).
// Solo lo que usa la vista del Cliente para mostrarlas en "Mis canjes" y en "Misiones".

/** Estado de la misión de un cliente (S5 §2.1). */
export type MyMissionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CLAIMED' | 'EXPIRED'

/** Qué mide la misión (S5 §2.3). */
export type MyMissionObjectiveType = 'CONSUMPTION_COUNT' | 'CONSUMPTION_AMOUNT'

export type MyMission = {
  /** Id de la asignación. En las rutas del Cliente nunca es null. */
  id: number
  mission: { id: number; name: string; description: string | null }
  /** 'YYYY-MM' */
  period: string
  objectiveType: MyMissionObjectiveType
  target: number
  /** 1 (lunes) a 7 (domingo); null = todos los días */
  daysOfWeek: number[] | null
  /** 'HH:mm' o null */
  timeFrom: string | null
  timeTo: string | null
  /** null = sin recompensa */
  rewardPoints: number | null
  /** Nunca mayor que `target` */
  progress: number
  status: MyMissionStatus
  completedAt: string | null
  claimedAt: string | null
  claimedBy: 'CUSTOMER' | 'SYSTEM' | null
  canClaim: boolean
  /** Último día del mes, 'YYYY-MM-DD' */
  endsAt: string
}
