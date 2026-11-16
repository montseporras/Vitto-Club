import type { MissionObjectiveType } from '../../domain/mission.js';
import { canClaim, endOfPeriod, type ClaimedBy, type CustomerMissionStatus } from '../../domain/mission-claim.js';
import type { StaffCustomerMission } from '../../application/missions-query.service.js';
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

// §3.3.4: lo que ve el personal, sin canClaim (el reclamo es solo del Cliente). `id` es null en las
// misiones en curso que el cliente todavía no tiene asignadas.
export type StaffCustomerMissionResponse = Omit<CustomerMissionResponse, 'id' | 'canClaim'> & { id: number | null };

export class CustomerMissionResponseDto {
  static forCustomer(view: CustomerMissionView): CustomerMissionResponse {
    // Mismos campos que el personal, con canClaim antes de endsAt, en el orden de §3.3.1
    const { id: _id, endsAt, ...rest } = CustomerMissionResponseDto.forStaff(view);
    return { id: view.id, ...rest, canClaim: canClaim(view.status, view.rewardPoints), endsAt };
  }

  static forStaff(view: StaffCustomerMission): StaffCustomerMissionResponse {
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
      endsAt: endOfPeriod(view.period),
    };
  }
}
