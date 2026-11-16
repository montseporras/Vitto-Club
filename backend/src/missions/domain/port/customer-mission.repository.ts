// Misiones de los clientes (tabla customer_missions). BASE-5 dejó el puerto vacío; cada historia agrega
// las operaciones que necesita. US-29: saber si la misión tiene clientes en un mes, vencer las En
// progreso al darla de baja y listar quiénes la completaron. US-30: asignar y llevar el avance.
import type { MissionObjective } from '../mission.js';

// US-30: una asignación En progreso, con su snapshot (S5-20)
export type InProgressCustomerMission = MissionObjective & {
  id: number;
  missionId: number;
  progress: number;
};

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
}
