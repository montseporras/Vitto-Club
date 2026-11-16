// Misiones de los clientes (tabla customer_missions). BASE-5 dejó el puerto vacío; cada historia agrega
// las operaciones que necesita. US-29: saber si la misión tiene clientes en un mes, vencer las En
// progreso al darla de baja y listar quiénes la completaron.

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
}
