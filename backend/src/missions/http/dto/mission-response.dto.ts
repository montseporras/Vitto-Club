import {
  missionPhase,
  type Mission,
  type MissionObjectiveType,
  type MissionPendingChanges,
  type MissionPhase,
  type MissionStatus,
} from '../../domain/mission.js';

// Tipo Mission de §3.1.1, en el orden del contrato
export type MissionResponse = {
  id: number;
  name: string;
  description: string | null;
  objectiveType: MissionObjectiveType;
  target: number;
  daysOfWeek: number[] | null;
  timeFrom: string | null;
  timeTo: string | null;
  rewardPoints: number | null;
  startMonth: string;
  endMonth: string | null;
  status: MissionStatus;
  phase: MissionPhase;
  pendingChanges: MissionPendingChanges | null;
  completedCount: number;
  createdAt: string;
  updatedAt: string;
};

export class MissionResponseDto {
  // `currentMonth` en YYYY-MM, hora de Argentina, para la fase
  static fromDomain(mission: Mission, completedCount: number, currentMonth: string): MissionResponse {
    return {
      id: mission.id,
      name: mission.name,
      description: mission.description,
      objectiveType: mission.objectiveType,
      target: mission.target,
      daysOfWeek: mission.daysOfWeek,
      timeFrom: mission.timeFrom,
      timeTo: mission.timeTo,
      rewardPoints: mission.rewardPoints,
      startMonth: mission.startMonth,
      endMonth: mission.endMonth,
      status: mission.status,
      phase: missionPhase(mission.startMonth, mission.endMonth, currentMonth),
      pendingChanges: mission.pendingChanges,
      completedCount,
      createdAt: mission.createdAt.toISOString(),
      updatedAt: mission.updatedAt.toISOString(),
    };
  }
}
