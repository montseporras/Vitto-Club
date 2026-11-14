import { DomainError } from './errors/domain.error.js';

// §3.7: tres niveles fijos. Bronce arranca en 0 y no se edita; Plata y Oro son configurables.
// La versión inicial de la configuración usa 300 y 800 (valores del prototipo).
export const DEFAULT_SILVER_MIN_POINTS = 300;
export const DEFAULT_GOLD_MIN_POINTS = 800;
export const BRONZE_MIN_POINTS = 0;
export const MAX_LEVEL_MIN_POINTS = 2_147_483_647;
// NIV-BEN (S5-2): el beneficio de un nivel es un texto informativo de hasta 255 caracteres
export const MAX_BENEFIT_LENGTH = 255;

// Mensajes de §3.7.2. El del máximo no está en el contrato (decisión de Jazmín).
export const LEVEL_MESSAGES = {
  empty: 'Completá este campo.',
  notInteger: 'Ingresá un número entero, sin decimales.',
  tooLarge: 'Ingresá un número menor o igual a 2.147.483.647.',
  silverNotPositive: 'El umbral de Plata debe ser mayor que 0',
  goldNotAboveSilver: 'El umbral de Oro debe ser mayor que el de Plata',
  // S5 §3.10
  benefitTooLong: 'El beneficio no puede superar los 255 caracteres.',
  benefitNotText: 'El beneficio debe ser un texto.',
} as const;

export type LevelThresholds = {
  silverMinPoints: number;
  goldMinPoints: number;
};

// Beneficio de cada nivel (NIV-BEN). null = sin beneficio.
export type LevelBenefits = {
  bronzeBenefit: string | null;
  silverBenefit: string | null;
  goldBenefit: string | null;
};

type ThresholdField = keyof LevelThresholds;

// Texto sin espacios en los bordes; vacío = null (S5 §3.10: "vacío = null")
export function normalizeBenefit(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

// Mensaje del problema de un beneficio, o null si está bien. Cuenta caracteres como la base
// (VARCHAR(255) cuenta caracteres, no unidades UTF-16: un emoji es uno).
export function benefitError(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return LEVEL_MESSAGES.benefitNotText;
  const trimmed = value.trim();
  return [...trimmed].length > MAX_BENEFIT_LENGTH ? LEVEL_MESSAGES.benefitTooLong : null;
}

export function assertBenefit(value: string | null | undefined, field: keyof LevelBenefits): void {
  const error = benefitError(value);
  if (error) throw new DomainError(error, field);
}

// Lo que recibe el guardado de niveles: los umbrales y, opcionales, los beneficios.
// Un beneficio que no viene se conserva; uno que viene vacío se borra.
export type LevelsInput = LevelThresholds & Partial<LevelBenefits>;

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
