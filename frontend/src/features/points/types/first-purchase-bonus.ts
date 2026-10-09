// Este archivo define la forma de los datos de la bonificación por primera compra.
// Lo usan el formulario, las llamadas a la API y el mock para hablar todos de lo mismo.

// Porcentaje sobre los puntos de la compra, o cantidad fija de puntos (RF-011).
export type BonusType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export const BONUS_TYPES: Record<BonusType, string> = {
  PERCENTAGE: 'Porcentaje',
  FIXED_AMOUNT: 'Puntos fijos',
};

// Cuerpo de PUT /loyalty/configuration/first-purchase-bonus.
export interface UpdateFirstPurchaseBonusDto {
  bonusType: BonusType;
  bonusValue: number;
}

// Respuesta de GET /loyalty/configuration/first-purchase-bonus. updatedAt es la fecha (ISO 8601)
// de la versión guardada: la agrega el backend, no se envía al guardar.
export interface FirstPurchaseBonus extends UpdateFirstPurchaseBonusDto {
  updatedAt: string;
}
