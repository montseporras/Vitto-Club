// La cookie del refresh token. Es httpOnly: el JavaScript del front no puede leerla, así
// que un script malicioso tampoco. El navegador la manda sola, y solo a las rutas de auth.
export const REFRESH_COOKIE = 'refresh_token';

// Incluye el prefijo global "api" de main.ts. La cookie no viaja al resto de la API.
export const REFRESH_COOKIE_PATH = '/api/auth';

// Lee una cookie del encabezado "Cookie" del pedido (formato "a=1; b=2").
export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;

    if (part.slice(0, separator).trim() === name) {
      const value = part.slice(separator + 1).trim();
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }

  return undefined;
}
