// ARRASTRE-S4 (A4-07, contrato S5 §7 #12): los orígenes que acepta CORS salen de la variable
// CORS_ORIGIN (varios, separados por coma). Sin la variable, o vacía, queda el origen de Vite, que
// es el que estaba escrito a mano en main.ts: el desarrollo sigue igual sin tocar el .env.
export const DEFAULT_CORS_ORIGIN = 'http://localhost:5173';

export function parseCorsOrigins(value: string | undefined): string[] {
  const origins = (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  return origins.length > 0 ? origins : [DEFAULT_CORS_ORIGIN];
}
