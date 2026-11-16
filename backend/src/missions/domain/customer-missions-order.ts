import type { CustomerMissionStatus } from './mission-claim.js';

// US-33 (contrato S5 §3.3.2): orden de las misiones de un cliente. El contrato dice "En progreso,
// Completada, Reclamada; después, por nombre"; las Vencidas van al final (decisión de Jazmín). El mismo
// orden vale para los meses anteriores.
const STATUS_RANK: Record<CustomerMissionStatus, number> = {
  IN_PROGRESS: 0,
  COMPLETED: 1,
  CLAIMED: 2,
  EXPIRED: 3,
};

type Sortable = { status: CustomerMissionStatus; mission: { name: string } };

export function sortCustomerMissions<T extends Sortable>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
      a.mission.name.localeCompare(b.mission.name, 'es', { sensitivity: 'base' }),
  );
}
