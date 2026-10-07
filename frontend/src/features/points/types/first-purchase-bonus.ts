// Este archivo define la forma de los datos de la bonificación por primera compra.
// Lo usan el formulario, las llamadas a la API y el mock para hablar todos de lo mismo.

// Porcentaje sobre los puntos de la compra, o cantidad fija de puntos (RF-011).
export type BonusType = 'PERCENTAGE' | 'FIXED';

export const BONUS_TYPES: Record<BonusType, string> = {
  PERCENTAGE: 'Porcentaje',
  FIXED: 'Puntos fijos',
};

// Respuesta de GET /settings/first-purchase-bonus.
export interface FirstPurchaseBonus {
  type: BonusType;
  value: number;
}

// Cuerpo de PUT /settings/first-purchase-bonus.
export type UpdateFirstPurchaseBonusDto = FirstPurchaseBonus;