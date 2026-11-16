import type { Mission, MissionPhase } from '../mission.js';
import type { MissionEditableState } from '../mission-edit.js';
import type { NewMission } from '../new-mission.js';

// §3.1.2 (S5-45): por fecha de alta
export const MISSION_ORDERS = ['RECENT', 'OLDEST'] as const;
export type MissionOrder = (typeof MISSION_ORDERS)[number];

export type MissionListFilters = {
  q?: string;
  // Sin valor = todas las no dadas de baja
  phase?: MissionPhase;
  order: MissionOrder;
  page: number;
  limit: number;
  // YYYY-MM, hora de Argentina: para la fase y para las completadas de este mes
  currentMonth: string;
};

export type MissionWithCompleted = { mission: Mission; completedCount: number };

export type MissionListResult = { items: MissionWithCompleted[]; total: number };

// Misiones del catálogo (tabla missions). BASE-5 dejó el puerto vacío; US-28 agrega crear y listar, y
// US-29 el detalle, editar y dar de baja.
export abstract class MissionRepository {
  // Sin distinguir mayúsculas ni espacios de los extremos, entre las no dadas de baja (§3.1.1).
  // `exceptId`: la misión que se está editando no choca consigo misma.
  abstract existsNotDeletedWithName(name: string, exceptId?: number): Promise<boolean>;

  abstract create(mission: NewMission): Promise<Mission>;

  abstract list(filters: MissionListFilters): Promise<MissionListResult>;

  // US-29: null si no existe o está dada de baja
  abstract findNotDeletedById(id: number): Promise<Mission | null>;

  // US-29: SELECT … FOR UPDATE dentro de la transacción ambiente. null si no existe o está dada de baja
  abstract lockNotDeletedForUpdate(id: number): Promise<Mission | null>;

  // completedCount (§3.1.1) de una misión en un mes YYYY-MM
  abstract countCompleted(id: number, period: string): Promise<number>;

  abstract update(id: number, state: MissionEditableState): Promise<Mission>;

  // DELETED (final) con su fecha de baja: libera el nombre (índice parcial missions_active_name_key)
  abstract markDeleted(id: number, now: Date): Promise<Mission>;

  // US-30 (§3.2): las misiones en curso en un mes YYYY-MM (ACTIVE y el mes dentro de su vigencia)
  abstract findRunningInMonth(month: string): Promise<Mission[]>;
}
