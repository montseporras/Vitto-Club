// Estados del dominio. El valor coincide con la API y la etiqueta es la que se muestra.

/** Estado de un consumo (contrato §2.2, enum ConsumptionStatus). */
export const CONSUMPTION_STATUSES = {
  REGISTERED: 'Registrado',
  VOIDED: 'Anulado',
} as const

export type ConsumptionStatus = keyof typeof CONSUMPTION_STATUSES

/** Tipo de movimiento de puntos (contrato §2.2, enum PointsMovementType): etiqueta del badge. */
export const POINTS_MOVEMENT_TYPES = {
  CONSUMPTION_CREDIT: 'Acreditación por consumo',
  VOID_REVERSAL: 'Reversión por anulación',
  MANUAL_ADJUSTMENT: 'Ajuste manual',
  EXPIRATION: 'Vencimiento',
  REDEMPTION: 'Canje',
} as const

export type PointsMovementType = keyof typeof POINTS_MOVEMENT_TYPES
