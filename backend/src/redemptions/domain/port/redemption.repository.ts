import type { DocumentType } from '../../../customers/domain/customer.js';
import { Redemption } from '../redemption.js';

// US-44 (CA-44.1): qué canjes toca un "vencer al leer". Por código (GET /canjes/:code, usar,
// rechazar, cancelar), por cliente (GET /customers/:id/canjes y /customers/me/canjes) o todos
// (GET /canjes del Administrador y el barrido). Firma acordada con Melisa.
export type RedemptionExpirationFilter = { code: string } | { customerId: number } | { all: true };

// Datos del cliente para el bloque "Cliente afectado" de la auditoría. Se leen de customers por
// Prisma: redemptions no importa el módulo customers (mismo criterio que points en US-25).
export type RedemptionCustomer = {
  id: number;
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
};

// BASE-4: puerto del repositorio de canjes. Cada historia agrega lo que necesita (crear,
// bloquear con FOR UPDATE, listados, vencer...).
export abstract class RedemptionRepository {
  // Para generarCodigoUnico (CA-B4.5): true si algún canje, en cualquier estado, ya lo usa
  abstract existsByCode(code: string): Promise<boolean>;

  // El código ya normalizado (normalizarCodigo). null si no existe
  abstract findByCode(code: string): Promise<Redemption | null>;

  // US-44: ids de los CONFIRMED con expires_at <= now que entran en el filtro, del más viejo al
  // más nuevo. Sin bloqueo: cada uno se bloquea después, en su propia transacción.
  abstract findExpiredCandidateIds(filter: RedemptionExpirationFilter, now: Date): Promise<number[]>;

  // US-44, barrido (CA-44.3): FOR UPDATE SKIP LOCKED. null si otro proceso lo tiene tomado (se
  // saltea) o si ya no existe.
  abstract lockForExpirationSkipLocked(id: number): Promise<Redemption | null>;

  // US-44, "vencer al leer": FOR UPDATE que espera a que se libere, para que quien lee vea el
  // estado final (decisión de Melisa). null si no existe.
  abstract lockForUpdate(id: number): Promise<Redemption | null>;

  // US-44: guarda el pase a EXPIRED (status, resolved_at, resolved_by_*)
  abstract saveExpiration(redemption: Redemption): Promise<void>;

  abstract findCustomer(customerId: number): Promise<RedemptionCustomer>;
}
