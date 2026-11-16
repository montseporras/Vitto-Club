import {
  missionPhase,
  type Mission,
  type MissionObjectiveType,
  type MissionPendingChanges,
  type MissionPhase,
  type MissionStatus,
} from '../../domain/mission.js';
import type { CompletedCustomerMission } from '../../domain/port/customer-mission.repository.js';

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

// GET /misiones/:id/completadas (§3.1.7): una fila de "Clientes que la completaron"
export type CompletedCustomerMissionResponse = {
  customerMissionId: number;
  customer: CompletedCustomerMission['customer'];
  status: CompletedCustomerMission['status'];
  completedAt: string;
  claimedAt: string | null;
  claimedBy: CompletedCustomerMission['claimedBy'];
  rewardPoints: number | null;
};

export class CompletedCustomerMissionResponseDto {
  static fromDomain(item: CompletedCustomerMission): CompletedCustomerMissionResponse {
    return {
      customerMissionId: item.customerMissionId,
      customer: {
        id: item.customer.id,
        firstName: item.customer.firstName,
        lastName: item.customer.lastName,
        documentType: item.customer.documentType,
        documentNumber: item.customer.documentNumber,
      },
      status: item.status,
      completedAt: item.completedAt.toISOString(),
      claimedAt: item.claimedAt ? item.claimedAt.toISOString() : null,
      claimedBy: item.claimedBy,
      rewardPoints: item.rewardPoints,
    };
  }
}
