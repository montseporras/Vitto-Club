import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { toArgentinaDateString } from '../../shared/time/argentina-date.js';
import { resolveCompletedPeriod } from '../domain/completed-period.js';
import { MissionsClaimService } from './missions-claim.service.js';
import { MISSION_NOT_FOUND_MESSAGE, type Mission } from '../domain/mission.js';
import {
  EMPTY_EDIT_MESSAGE,
  isEmptyEdit,
  planMissionEdit,
  type MissionEditInput,
  type MissionEditPlan,
} from '../domain/mission-edit.js';
import { buildNewMission, type NewMissionInput } from '../domain/new-mission.js';
import {
  CompletedCustomerMission,
  CustomerMissionRepository,
} from '../domain/port/customer-mission.repository.js';
import {
  MissionListFilters,
  MissionListResult,
  MissionRepository,
  MissionWithCompleted,
} from '../domain/port/mission.repository.js';

// §3.1.3 y §5
export const MISSION_NAME_IN_USE = {
  message: 'Ya existe una misión con ese nombre.',
  code: 'MISSION_NAME_IN_USE',
} as const;

// §3.1.4 a §3.1.7: una dada de baja tampoco existe para el Administrador. Vive en el dominio para que
// MissionsClaimService lo use sin importar este archivo (evita una importación circular).
export { MISSION_NOT_FOUND_MESSAGE };

// §3.1.5: el motivo de las asignaciones que vencen al dar de baja la misión
export const DELETED_MISSION_EXPIRATION_REASON = 'Misión dada de baja';

// El mes actual en hora de Argentina, YYYY-MM
export const currentArgentinaMonth = (now: Date): string => toArgentinaDateString(now).slice(0, 7);

// US-29 (§3.1.4): lo que el controller necesita para responder y auditar
export type MissionEditResult = MissionWithCompleted & { plan: MissionEditPlan };

// US-29 (§3.1.5): la respuesta es { expired, claimed }; la misión va para la auditoría
export type MissionDeletionResult = { mission: Mission; expired: number; claimed: number };

// Casos de uso del catálogo de misiones del Administrador. US-28: crear y listar. US-29: detalle,
// editar, dar de baja y quiénes la completaron.
@Injectable()
export class MissionsService {
  constructor(
    private readonly missionRepository: MissionRepository,
    private readonly customerMissionRepository: CustomerMissionRepository,
    private readonly claims: MissionsClaimService,
  ) {}

  // US-28 (§3.1.3): crea la misión en ACTIVE. Corre dentro de la transacción de quien llama (el
  // controller la abre con AuditService.capture, para que MISSION_CREATED quede en la misma). Si dos
  // altas con el mismo nombre llegan a la vez, el índice missions_active_name_key frena a la segunda
  // y el filtro responde el mismo 409.
  async create(input: NewMissionInput, now: Date = new Date()): Promise<Mission> {
    const mission = buildNewMission(input, currentArgentinaMonth(now));
    if (await this.missionRepository.existsNotDeletedWithName(mission.name)) {
      throw new ConflictException(MISSION_NAME_IN_USE);
    }
    return await this.missionRepository.create(mission);
  }

  // US-28 (§3.1.2): listado del Administrador. Solo lectura: no abre transacción ni audita.
  async list(filters: Omit<MissionListFilters, 'currentMonth'>, now: Date = new Date()): Promise<MissionListResult> {
    return await this.missionRepository.list({ ...filters, currentMonth: currentArgentinaMonth(now) });
  }

  // US-29 (§3.1.6): con sus completadas de este mes. Solo lectura.
  async getById(id: number, now: Date = new Date()): Promise<MissionWithCompleted> {
    const mission = await this.missionRepository.findNotDeletedById(id);
    if (!mission) throw new NotFoundException(MISSION_NOT_FOUND_MESSAGE);
    return { mission, completedCount: await this.missionRepository.countCompleted(id, currentArgentinaMonth(now)) };
  }

  // US-29 (§3.1.4, S5-20). Corre dentro de la transacción de quien llama (AuditService.capture):
  // bloquea la misión antes de mirar si tiene clientes este mes, para que dos ediciones no se pisen.
  // Sin cambios, no escribe nada (plan.changed = false) y quien llama no audita.
  async update(id: number, input: MissionEditInput, now: Date = new Date()): Promise<MissionEditResult> {
    if (isEmptyEdit(input)) throw new BadRequestException(EMPTY_EDIT_MESSAGE);

    const current = await this.missionRepository.lockNotDeletedForUpdate(id);
    if (!current) throw new NotFoundException(MISSION_NOT_FOUND_MESSAGE);

    const currentMonth = currentArgentinaMonth(now);
    const plan = planMissionEdit(current, input, {
      currentMonth,
      hasAssignmentsThisMonth: await this.customerMissionRepository.existsForPeriod(id, currentMonth),
    });

    if (plan.next.name !== current.name && (await this.missionRepository.existsNotDeletedWithName(plan.next.name, id))) {
      throw new ConflictException(MISSION_NAME_IN_USE);
    }

    const mission = plan.changed ? await this.missionRepository.update(id, plan.next) : current;
    return { mission, plan, completedCount: await this.missionRepository.countCompleted(id, currentMonth) };
  }

  // US-29 (§3.1.5, S5-20). Corre dentro de la transacción de quien llama (AuditService.capture): bloquea
  // la misión, vence las En progreso del mes con "Misión dada de baja", reclama solas las Completadas con
  // recompensa y la pasa a DELETED. Las Completadas sin recompensa quedan igual. Los
  // MISSION_REWARD_CLAIMED quedan antes que el MISSION_DELETED, que escribe quien llama al final. Una dada de baja o que no existe da 404, también si se
  // elimina dos veces (CA-29.6).
  async delete(id: number, now: Date = new Date()): Promise<MissionDeletionResult> {
    const current = await this.missionRepository.lockNotDeletedForUpdate(id);
    if (!current) throw new NotFoundException(MISSION_NOT_FOUND_MESSAGE);

    const currentMonth = currentArgentinaMonth(now);
    const expired = await this.customerMissionRepository.expireInProgress(
      id,
      currentMonth,
      DELETED_MISSION_EXPIRATION_REASON,
      now,
    );
    // S5-5 y S5-20: nadie pierde una recompensa ganada. Las Completadas con recompensa del mes se
    // reclaman solas (Sistema, "Reclamada por: Automático"), cada una con su MISSION_REWARD_CLAIMED, con
    // reclamar() de US-31 (se completó en la rama de US-31, a pedido de Jazmín).
    const completedWithReward = await this.customerMissionRepository.lockCompletedWithReward(id, currentMonth);
    for (const customerMissionId of completedWithReward) {
      await this.claims.reclamar(customerMissionId, 'SYSTEM', { now });
    }
    const claimed = completedWithReward.length;

    const mission = await this.missionRepository.markDeleted(id, now);
    return { mission, expired, claimed };
  }

  // US-29 (§3.1.7): Completadas y Reclamadas de un mes. Solo lectura: no asigna nada ni audita. El mes
  // se valida antes de buscar la misión.
  async completed(id: number, period: string | undefined, now: Date = new Date()): Promise<CompletedCustomerMission[]> {
    const month = resolveCompletedPeriod(period, currentArgentinaMonth(now));
    const mission = await this.missionRepository.findNotDeletedById(id);
    if (!mission) throw new NotFoundException(MISSION_NOT_FOUND_MESSAGE);
    return await this.customerMissionRepository.findCompleted(id, month);
  }
}
