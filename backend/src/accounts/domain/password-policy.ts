import { MAX_PASSWORD_BYTES, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from './password.js';

// Códigos fijos del contrato (§3.11.1 y §5): el frontend decide por esto, no por el texto.
export const PASSWORD_SAME_AS_CURRENT = 'PASSWORD_SAME_AS_CURRENT';
export const PASSWORD_SAME_AS_DOCUMENT = 'PASSWORD_SAME_AS_DOCUMENT';

export type PasswordViolation = {
  // Solo las reglas que el contrato identifica con un código lo llevan
  code?: typeof PASSWORD_SAME_AS_CURRENT | typeof PASSWORD_SAME_AS_DOCUMENT;
  message: string;
};

export type NewPasswordCheck = {
  newPassword: string;
  currentPassword: string;
  accountEmail: string;
  // Solo en cuentas de cliente: su número de documento normalizado
  documentNumber?: string;
};

// Política de contraseña de este sprint (contrato §3.11). No se normaliza nada: los espacios y las
// mayúsculas cuentan, y las comparaciones son literales. Devuelve la primera regla que se rompe, en
// el orden del contrato, o null si la contraseña es válida.
export function checkNewPassword(input: NewPasswordCheck): PasswordViolation | null {
  const { newPassword } = input;

  if (!newPassword) {
    return { message: 'Este campo es obligatorio' };
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH || newPassword.length > MAX_PASSWORD_LENGTH) {
    return { message: 'Tiene que tener entre 8 y 64 caracteres' };
  }
  if (Buffer.byteLength(newPassword, 'utf8') > MAX_PASSWORD_BYTES) {
    return { message: 'La contraseña es demasiado larga' };
  }
  if (newPassword === input.accountEmail) {
    return { message: 'La contraseña no puede ser igual al mail' };
  }
  if (newPassword === input.currentPassword) {
    return { code: PASSWORD_SAME_AS_CURRENT, message: 'La nueva contraseña no puede ser igual a la actual' };
  }
  if (input.documentNumber !== undefined && newPassword === input.documentNumber) {
    return { code: PASSWORD_SAME_AS_DOCUMENT, message: 'La contraseña no puede ser tu número de documento' };
  }
  return null;
}
