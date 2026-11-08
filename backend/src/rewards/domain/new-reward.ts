import { DomainError } from './errors/domain.error.js';

// US-34 (contrato S4 §3.2.3): los datos de una recompensa nueva, ya normalizados. Los tipos, los
// largos y los rangos los valida el DTO con los mensajes del contrato; acá quedan las reglas que
// dependen de algo más que el valor (la fecha de hoy) y la normalización.
export type NewRewardInput = {
  name: string;
  description?: string | null;
  points: number;
  // null = sin límite
  stock: number | null;
  // YYYY-MM-DD; null = no vence
  expiresAt: string | null;
};

export type NewReward = {
  name: string;
  description: string | null;
  points: number;
  stock: number | null;
  expiresAt: string | null;
};

export const PAST_EXPIRATION_MESSAGE = 'La fecha no puede ser anterior a hoy.';

// `hoyArgentina` en YYYY-MM-DD. Nace ACTIVE (lo pone la base por defecto). El nombre y la
// descripción se recortan; una descripción vacía se guarda como null. La fecha puede ser hoy
// (vence hoy) o posterior; las dos son YYYY-MM-DD, así que el orden de los textos es el de las
// fechas.
export function buildNewReward(input: NewRewardInput, hoyArgentina: string): NewReward {
  if (input.expiresAt !== null && input.expiresAt < hoyArgentina) {
    throw new DomainError(PAST_EXPIRATION_MESSAGE, 'expiresAt');
  }

  const description = input.description?.trim() ?? '';
  return {
    name: input.name.trim(),
    description: description === '' ? null : description,
    points: input.points,
    stock: input.stock,
    expiresAt: input.expiresAt,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

// §3.1: expiresAt − hoy (hora de Argentina), en días. null si no vence; negativo si ya venció.
export function daysToExpire(expiresAt: string | null, hoyArgentina: string): number | null {
  if (expiresAt === null) return null;
  return Math.round((Date.parse(`${expiresAt}T00:00:00Z`) - Date.parse(`${hoyArgentina}T00:00:00Z`)) / DAY_MS);
}
