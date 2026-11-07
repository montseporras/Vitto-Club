import { Redemption } from '../redemption.js';

// BASE-4: puerto del repositorio de canjes. Cada historia agrega lo que necesita (crear,
// bloquear con FOR UPDATE, listados, vencer...).
export abstract class RedemptionRepository {
  // Para generarCodigoUnico (CA-B4.5): true si algún canje, en cualquier estado, ya lo usa
  abstract existsByCode(code: string): Promise<boolean>;

  // El código ya normalizado (normalizarCodigo). null si no existe
  abstract findByCode(code: string): Promise<Redemption | null>;
}
