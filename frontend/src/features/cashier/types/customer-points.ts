/** Nivel de fidelización (contrato §2.2). */
export type Level = 'BRONZE' | 'SILVER' | 'GOLD'

/** Respuesta de GET /api/customers/:id/puntos (contrato §3.4.1). */
export type CustomerPoints = {
  customerId: number
  /** Puede ser negativo */
  balance: number
  negativeBalance: boolean
  lifetimePoints: number
  level: {
    current: Level
    next: Level | null
    currentMinPoints: number
    nextMinPoints: number
    pointsToNext: number
    progressPercent: number
  }
  nextExpirations: { points: number; expiresAt: string }[]
}
