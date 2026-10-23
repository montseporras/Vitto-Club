// La cookie del refresh token. Es httpOnly: el JavaScript del front no puede leerla, así
// que un script malicioso tampoco. El navegador la manda sola, y solo a las rutas de auth.
export const REFRESH_COOKIE = 'refresh_token';

// Incluye el prefijo global "api" de main.ts. Antes era '/api/auth'; PERFIL lo amplió a '/api': la
// cookie tiene que llegar también a PATCH /api/mi-cuenta/password, que necesita saber cuál es la
// sesión actual para dejarla abierta al cerrar las otras. Sigue siendo httpOnly y SameSite=Lax.
export const REFRESH_COOKIE_PATH = '/api';

// Path con el que se emitía antes. Un navegador que todavía la tiene la manda junto a la nueva
// y la más específica va primero: hay que borrarla al emitir la nueva.
export const LEGACY_REFRESH_COOKIE_PATH = '/api/auth';

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
