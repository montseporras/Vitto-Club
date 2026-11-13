import type { NotificationType } from './notification.js';

// Contrato S5 §3.6.1: las variables que se pueden usar en el mensaje de cada tipo. Se reemplazan al enviar.
export const NOTIFICATION_VARIABLES: Record<NotificationType, readonly string[]> = {
  POINTS_EXPIRING: ['nombre', 'puntos', 'fecha'],
  BIRTHDAY: ['nombre', 'puntos'],
  MISSION: ['nombre', 'mision'],
  // Cada promoción se escribe desde cero al enviarla: solo {nombre} (§3.7.3)
  PROMOTION: ['nombre'],
};

// Una variable es cualquier texto entre llaves: {nombre}, {puntos}... Una llave suelta no es una variable
const VARIABLE_PATTERN = /\{([^{}]*)\}/g;

export function variablesIn(text: string): string[] {
  return [...text.matchAll(VARIABLE_PATTERN)].map((match) => match[1]);
}

// La primera variable del texto que ese tipo no admite, o undefined si todas sirven
export function firstInvalidVariable(type: NotificationType, text: string): string | undefined {
  const allowed = NOTIFICATION_VARIABLES[type];
  return variablesIn(text).find((name) => !allowed.includes(name));
}

// Reemplaza cada {variable} por su valor. Si falta el valor de una variable del texto, **lanza un error**:
// es un error de programación de quien llama, y es mejor verlo en los tests que mandarle al cliente un
// correo que dice "tenés {puntos} pts" (decisión tomada a pedido de Montse, 12/11/2026).
export function replaceVariables(text: string, values: Record<string, string>): string {
  return text.replace(VARIABLE_PATTERN, (_whole, name: string) => {
    if (!Object.hasOwn(values, name)) {
      throw new Error(`Falta el valor de la variable {${name}}`);
    }
    return values[name];
  });
}
