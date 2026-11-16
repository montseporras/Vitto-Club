// Misiones de los clientes (tabla customer_missions). BASE-5 dejó el puerto vacío; cada historia agrega
// las operaciones que necesita. US-29: saber si la misión tiene clientes en un mes, vencer las En
// progreso al darla de baja y listar quiénes la completaron. US-30: asignar y llevar el avance.
import type { MissionObjective } from '../mission.js';
import type { ClaimedBy, CustomerMissionStatus } from '../mission-claim.js';
import type { AffectedCustomerSnapshot } from '../../../audit/domain/audit-entries.js';

// US-30: una asignación En progreso, con su snapshot (S5-20)
export type InProgressCustomerMission = MissionObjective & {
  id: number;
  missionId: number;
  progress: number;
};

// US-31: una asignación completa, para reclamar y para responder el tipo CustomerMission (§3.3.1)
export type CustomerMissionView = MissionObjective & {
  id: number;
  mission: { id: number; name: string; description: string | null };
  customerId: number;
  // YYYY-MM
  period: string;
  progress: number;
  status: CustomerMissionStatus;
  completedAt: Date | null;
  claimedAt: Date | null;
  claimedBy: ClaimedBy | null;
};

// US-31: el cliente de la asignación, leído por Prisma (missions no importa customers), para saber si
// está dado de baja y para el bloque "Cliente afectado" de la auditoría
export type MissionCustomer = AffectedCustomerSnapshot & { isActive: boolean };

export type CompletedCustomerMission = {
  customerMissionId: number;
  customer: {
    id: number;
    firstName: string;
    lastName: string;
    documentType: string;
    documentNumber: string;
  };
  status: 'COMPLETED' | 'CLAIMED';
  completedAt: Date;
  claimedAt: Date | null;
  claimedBy: 'CUSTOMER' | 'SYSTEM' | null;
  // Snapshot de la asignación
  rewardPoints: number | null;
};

export abstract class CustomerMissionRepository {
  // `period` en YYYY-MM. Cualquier estado
  abstract existsForPeriod(missionId: number, period: string): Promise<boolean>;

  // Las IN_PROGRESS del mes pasan a EXPIRED con su motivo. Devuelve cuántas
  abstract expireInProgress(missionId: number, period: string, reason: string, now: Date): Promise<number>;

  // Completadas y Reclamadas del mes, por completedAt descendente
  abstract findCompleted(missionId: number, period: string): Promise<CompletedCustomerMission[]>;

  // US-30 (§3.2, S5-19): asigna En progreso, con su snapshot, las misiones que el cliente todavía no
  // tiene en el mes. Si otra transacción la asignó antes, no la duplica (índice único).
  abstract assignMissing(
    customerId: number,
    period: string,
    assignments: (MissionObjective & { missionId: number })[],
  ): Promise<void>;

  // US-30: las En progreso del cliente en el mes, bloqueadas (SELECT … FOR UPDATE)
  abstract lockInProgress(customerId: number, period: string): Promise<InProgressCustomerMission[]>;

  // US-30: guarda el avance; `completedAt` la pasa a COMPLETED
  abstract saveProgress(id: number, progress: number, completedAt: Date | null): Promise<void>;

  // US-31 (§3.3.3): bloquea la asignación (SELECT … FOR UPDATE). null si no existe
  abstract lockById(id: number): Promise<CustomerMissionView | null>;

  // US-31: Reclamada con claimedAt y claimedBy
  abstract markClaimed(id: number, by: ClaimedBy, now: Date): Promise<CustomerMissionView>;

  // US-29 (§3.1.5): las Completadas con recompensa de la misión en el mes, bloqueadas, para reclamarlas solas
  abstract lockCompletedWithReward(missionId: number, period: string): Promise<number[]>;

  abstract findCustomer(customerId: number): Promise<MissionCustomer | null>;

  // US-32 (§3.4): las asignaciones de meses ya terminados (period < `currentMonth`, YYYY-MM) que el
  // proceso de fin de mes tiene que resolver: En progreso, y Completadas con recompensa
  abstract findPendingBefore(currentMonth: string): Promise<{ id: number; period: string }[]>;

  // US-32: bloquea la asignación con FOR UPDATE SKIP LOCKED. null si otra transacción la tiene (la
  // resuelve esa) o si ya no existe
  abstract lockForExpiration(id: number): Promise<CustomerMissionView | null>;

  // US-32: En progreso → Vencida con su motivo
  abstract expire(id: number, reason: string, now: Date): Promise<void>;
}
