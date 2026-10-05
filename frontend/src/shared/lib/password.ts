// Contraseñas iniciales para los usuarios del sistema.
// Regla: 8 caracteres como mínimo, con al menos una mayúscula, un número y un
// carácter especial. Se dejan afuera los caracteres que se confunden al
// dictarlos o copiarlos a mano (I, l, O, 0, 1).
const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const SPECIAL = '!@#$%&*?';
const ALL = UPPERCASE + LOWERCASE + DIGITS + SPECIAL;

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_RULES = {
  uppercase: /[A-Z]/,
  digit: /[0-9]/,
  special: /[^A-Za-z0-9]/,
} as const;

// Entero al azar en [0, max) con crypto (Math.random no sirve para contraseñas).
// Descarta los valores que sesgarían el resultado.
function randomInt(max: number): number {
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const buffer = new Uint32Array(1);
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % max;
}

const pick = (chars: string) => chars[randomInt(chars.length)];

export function generatePassword(length = PASSWORD_MIN_LENGTH): string {
  // Un carácter de cada tipo obligatorio y el resto de cualquiera
  const chars = [pick(UPPERCASE), pick(LOWERCASE), pick(DIGITS), pick(SPECIAL)];
  while (chars.length < length) chars.push(pick(ALL));

  // Fisher-Yates, para que los obligatorios no queden siempre al principio
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
