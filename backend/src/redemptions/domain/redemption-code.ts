import { randomInt } from 'node:crypto';

// BASE-4 (CA-B4.5, contrato S4 §3.6.1, decisión S4-5). Lo usan US-40 (generar) y US-41, US-42 y
// US-43 (normalizar lo que escribe el empleado).

// Sin 0, O, 1 ni I, para que no se confundan al dictarlo o escribirlo
export const REDEMPTION_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const REDEMPTION_CODE_LENGTH = 6;
// Si el código choca con uno existente se genera otro, hasta 5 veces; después, 500
export const MAX_REDEMPTION_CODE_ATTEMPTS = 5;

// Mismo patrón que el CHECK redemptions_code_format_check de la migración
const REDEMPTION_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

// Devuelve un entero en [0, max). Por defecto, crypto.randomInt; los tests pasan uno fijo.
export type RandomIntFn = (max: number) => number;

// No es un DomainError a propósito: no es culpa del pedido. Se responde como 500 (§3.6.1).
export class RedemptionCodeGenerationError extends Error {
  constructor() {
    super(`Could not generate a unique redemption code after ${MAX_REDEMPTION_CODE_ATTEMPTS} attempts`);
    this.name = 'RedemptionCodeGenerationError';
  }
}

// Un código aleatorio. No se deriva del id: es lo que presenta el cliente y no tiene que poder
// adivinarse.
export function generarCodigo(random: RandomIntFn = randomInt): string {
  let code = '';
  for (let i = 0; i < REDEMPTION_CODE_LENGTH; i++) {
    code += REDEMPTION_CODE_ALPHABET[random(REDEMPTION_CODE_ALPHABET.length)];
  }
  return code;
}

// Un código que no exista todavía. `existe` consulta la base (RedemptionRepository.existsByCode).
// Igual queda el UNIQUE de la base por si dos confirmaciones generan el mismo código a la vez.
export async function generarCodigoUnico(
  existe: (code: string) => Promise<boolean>,
  random: RandomIntFn = randomInt,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_REDEMPTION_CODE_ATTEMPTS; attempt++) {
    const code = generarCodigo(random);
    if (!(await existe(code))) return code;
  }
  throw new RedemptionCodeGenerationError();
}

// Lo que escribe el empleado: mayúsculas, sin espacios ni guiones (" k7mp-2x " → "K7MP2X").
// Devuelve null si después de normalizar no cumple el formato: quien llama lo trata como un
// código inexistente (404 "Código no encontrado."), sin distinguir "mal escrito" de "no existe".
export function normalizarCodigo(raw: string): string | null {
  const normalized = raw.replace(/[\s-]/g, '').toUpperCase();
  return REDEMPTION_CODE_PATTERN.test(normalized) ? normalized : null;
}
