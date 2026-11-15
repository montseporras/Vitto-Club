import type { Mission, MissionPhase } from '../mission.js';
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

// Misiones del catálogo (tabla missions). BASE-5 dejó el puerto vacío; US-28 agrega crear y listar.
// Cada historia siguiente agrega lo que necesita (US-29: detalle, editar, dar de baja).
export abstract class MissionRepository {
  // Sin distinguir mayúsculas ni espacios de los extremos, entre las no dadas de baja (§3.1.1)
  abstract existsNotDeletedWithName(name: string): Promise<boolean>;

  abstract create(mission: NewMission): Promise<Mission>;

  abstract list(filters: MissionListFilters): Promise<MissionListResult>;
}
