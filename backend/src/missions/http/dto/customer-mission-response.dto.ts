import type { MissionObjectiveType } from '../../domain/mission.js';
import { canClaim, endOfPeriod, type ClaimedBy, type CustomerMissionStatus } from '../../domain/mission-claim.js';
import type { CustomerMissionView } from '../../domain/port/customer-mission.repository.js';

// Tipo CustomerMission de §3.3.1, como lo ve el Cliente (con canClaim), en el orden del contrato
export type CustomerMissionResponse = {
  id: number;
  mission: { id: number; name: string; description: string | null };
  period: string;
  objectiveType: MissionObjectiveType;
  target: number;
  daysOfWeek: number[] | null;
  timeFrom: string | null;
  timeTo: string | null;
  rewardPoints: number | null;
  progress: number;
  status: CustomerMissionStatus;
  completedAt: string | null;
  claimedAt: string | null;
  claimedBy: ClaimedBy | null;
  canClaim: boolean;
  endsAt: string;
};

export class CustomerMissionResponseDto {
  static forCustomer(view: CustomerMissionView): CustomerMissionResponse {
    return {
      id: view.id,
      mission: { id: view.mission.id, name: view.mission.name, description: view.mission.description },
      period: view.period,
      objectiveType: view.objectiveType,
      target: view.target,
      daysOfWeek: view.daysOfWeek,
      timeFrom: view.timeFrom,
      timeTo: view.timeTo,
      rewardPoints: view.rewardPoints,
      progress: view.progress,
      status: view.status,
      completedAt: view.completedAt ? view.completedAt.toISOString() : null,
      claimedAt: view.claimedAt ? view.claimedAt.toISOString() : null,
      claimedBy: view.claimedBy,
      canClaim: canClaim(view.status, view.rewardPoints),
      endsAt: endOfPeriod(view.period),
    };
  }
}
