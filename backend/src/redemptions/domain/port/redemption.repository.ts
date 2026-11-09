import type { DocumentType } from '../../../customers/domain/customer.js';
import type { NewRedemption } from '../new-redemption.js';
import { Redemption, type RedemptionStatus } from '../redemption.js';
import type { RedemptionDateRange, RedemptionOrder } from '../redemption-filters.js';

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

// US-45 (§3.12): paginado y orden por createdAt (desc por defecto), con el rango de createdAt ya
// armado en hora de Argentina ([createdFrom, createdBefore)).
export type RedemptionPageQuery = {
  range: RedemptionDateRange;
  order: RedemptionOrder;
  page: number;
  limit: number;
};

// Mis canjes (§3.12.1). statuses undefined = todos
export type CustomerRedemptionsQuery = RedemptionPageQuery & { statuses?: RedemptionStatus[] };

// Canjes del Administrador (§3.12.3). Los textos ya vienen normalizados; documentType solo viene
// junto con documentNumber.
export type RedemptionListQuery = RedemptionPageQuery & {
  status?: RedemptionStatus;
  document?: { type: DocumentType; number: string };
  code?: string;
  // Minúsculas y sin tildes (foldRewardNameFilter)
  rewardName?: string;
};

export type RedemptionWithCustomer = { redemption: Redemption; customer: RedemptionCustomer };
export type RedemptionPage<T> = { items: T[]; total: number };

// BASE-4: puerto del repositorio de canjes. Cada historia agrega lo que necesita (crear,
// bloquear con FOR UPDATE, listados, vencer...).
export abstract class RedemptionRepository {
  // US-40: guarda el canje recién confirmado (estado CONFIRMED por defecto de la base)
  abstract create(data: NewRedemption): Promise<Redemption>;

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

  // US-43 y US-42: el canje del código (ya normalizado) bloqueado con FOR UPDATE, para que dos
  // operaciones a la vez (usar, rechazar, cancelar) no ganen las dos (decisión de Melisa). null si
  // no existe.
  abstract lockByCodeForUpdate(code: string): Promise<Redemption | null>;

  // US-43 (§3.10.4): los CONFIRMED vigentes (expires_at > now) del filtro, bloqueados con
  // FOR UPDATE, en orden de id.
  abstract lockConfirmedForRejection(filter: AutomaticRejectionFilter, now: Date): Promise<Redemption[]>;

  // US-43: guarda el pase a REJECTED o CANCELLED (status, resolved_at, resolved_by_*, rejection_reason)
  abstract saveResolution(redemption: Redemption): Promise<void>;

  // US-42: guarda el pase a USED (status, resolved_at, resolved_by_*, balance_before, balance_after)
  abstract saveUse(redemption: Redemption): Promise<void>;

  // US-45, Mis canjes (§3.12.1): los canjes del cliente, filtrados y paginados
  abstract findPageByCustomer(
    customerId: number,
    query: CustomerRedemptionsQuery,
  ): Promise<RedemptionPage<Redemption>>;

  // US-45, panel de Caja (§3.12.2, S4-10): solo los CONFIRMED vigentes (expires_at > now), el que
  // vence primero arriba. Sin paginado.
  abstract findUsableByCustomer(customerId: number, now: Date): Promise<Redemption[]>;

  // US-45, Canjes del Administrador (§3.12.3)
  abstract findPage(query: RedemptionListQuery): Promise<RedemptionPage<RedemptionWithCustomer>>;

  // US-45: null si el cliente no existe (404); si existe, si está activo
  abstract findCustomerStatus(customerId: number): Promise<{ isActive: boolean } | null>;
}
