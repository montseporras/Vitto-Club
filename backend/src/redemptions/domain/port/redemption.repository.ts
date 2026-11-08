import type { DocumentType } from '../../../customers/domain/customer.js';
import { Redemption } from '../redemption.js';

// US-44 (CA-44.1): qué canjes toca un "vencer al leer". Por código (GET /canjes/:code, usar,
// rechazar, cancelar), por cliente (GET /customers/:id/canjes y /customers/me/canjes) o todos
// (GET /canjes del Administrador y el barrido). Firma acordada con Melisa. US-43 suma
// { rewardId }, para vencer los de una recompensa antes de rechazarlos al desactivarla o eliminarla.
export type RedemptionExpirationFilter =
  | { code: string }
  | { customerId: number }
  | { rewardId: number }
  | { all: true };

// US-43 (§3.10.4): de quién son los Confirmados que rechaza el Sistema
export type AutomaticRejectionFilter = { rewardId: number } | { customerId: number };

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

  // US-43: el canje del código (ya normalizado) bloqueado con FOR UPDATE, para que un usar y un
  // rechazar (o cancelar) a la vez no ganen los dos (decisión de Melisa). null si no existe.
  abstract lockByCodeForUpdate(code: string): Promise<Redemption | null>;

  // US-43 (§3.10.4): los CONFIRMED vigentes (expires_at > now) del filtro, bloqueados con
  // FOR UPDATE, en orden de id.
  abstract lockConfirmedForRejection(filter: AutomaticRejectionFilter, now: Date): Promise<Redemption[]>;

  // US-43: guarda el pase a REJECTED o CANCELLED (status, resolved_at, resolved_by_*, rejection_reason)
  abstract saveResolution(redemption: Redemption): Promise<void>;
}
