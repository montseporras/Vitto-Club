import { DomainError } from './errors/domain.error.js';

// §3.7: tres niveles fijos. Bronce arranca en 0 y no se edita; Plata y Oro son configurables.
// La versión inicial de la configuración usa 300 y 800 (valores del prototipo).
export const DEFAULT_SILVER_MIN_POINTS = 300;
export const DEFAULT_GOLD_MIN_POINTS = 800;
export const BRONZE_MIN_POINTS = 0;
export const MAX_LEVEL_MIN_POINTS = 2_147_483_647;

// Mensajes de §3.7.2. El del máximo no está en el contrato (decisión de Jazmín).
export const LEVEL_MESSAGES = {
  empty: 'Completá este campo.',
  notInteger: 'Ingresá un número entero, sin decimales.',
  tooLarge: 'Ingresá un número menor o igual a 2.147.483.647.',
  silverNotPositive: 'El umbral de Plata debe ser mayor que 0',
  goldNotAboveSilver: 'El umbral de Oro debe ser mayor que el de Plata',
} as const;

export type LevelThresholds = {
  silverMinPoints: number;
  goldMinPoints: number;
};

type ThresholdField = keyof LevelThresholds;

// Mensaje del primer problema de un umbral por sí solo (sin compararlo con el otro), o null
export function thresholdFormatError(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return LEVEL_MESSAGES.empty;
  if (typeof value !== 'number' || !Number.isInteger(value)) return LEVEL_MESSAGES.notInteger;
  if (value > MAX_LEVEL_MIN_POINTS) return LEVEL_MESSAGES.tooLarge;
  return null;
}

// Plata > 0 y Oro > Plata (§3.7.2)
export function assertLevelThresholds(thresholds: LevelThresholds): void {
  const fields: ThresholdField[] = ['silverMinPoints', 'goldMinPoints'];
  for (const field of fields) {
    const error = thresholdFormatError(thresholds[field]);
    if (error) throw new DomainError(error, field);
  }
  if (thresholds.silverMinPoints <= 0) {
    throw new DomainError(LEVEL_MESSAGES.silverNotPositive, 'silverMinPoints');
  }
  if (thresholds.goldMinPoints <= thresholds.silverMinPoints) {
    throw new DomainError(LEVEL_MESSAGES.goldNotAboveSilver, 'goldMinPoints');
  }
}
