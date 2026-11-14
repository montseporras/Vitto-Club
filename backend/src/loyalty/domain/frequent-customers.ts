import { DomainError } from './errors/domain.error.js';

// S5 §3.9.6 (S5-22): un cliente es "frecuente" si tiene al menos N consumos REGISTERED en el mes.
// N se guarda en la versión de la configuración del programa (RF-014). Por defecto 3, entero de 1 a 100.
export const DEFAULT_FREQUENT_MIN_CONSUMPTIONS = 3;
export const MIN_FREQUENT_MIN_CONSUMPTIONS = 1;
export const MAX_FREQUENT_MIN_CONSUMPTIONS = 100;

export const FREQUENT_MIN_CONSUMPTIONS_MESSAGE = 'Ingresá un número entero de 1 a 100.';

// Mensaje del problema del valor, o null si es válido (lo usan el DTO y el dominio)
export function frequentMinConsumptionsError(value: unknown): string | null {
  const valid =
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_FREQUENT_MIN_CONSUMPTIONS &&
    value <= MAX_FREQUENT_MIN_CONSUMPTIONS;
  return valid ? null : FREQUENT_MIN_CONSUMPTIONS_MESSAGE;
}

export function assertFrequentMinConsumptions(value: unknown): asserts value is number {
  const error = frequentMinConsumptionsError(value);
  if (error) throw new DomainError(error, 'minConsumptions');
}
