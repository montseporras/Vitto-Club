import { ConflictException, Injectable } from '@nestjs/common';
import { toArgentinaDateString } from '../../shared/time/argentina-date.js';
import type { Mission } from '../domain/mission.js';
import { buildNewMission, type NewMissionInput } from '../domain/new-mission.js';
import {
  MissionListFilters,
  MissionListResult,
  MissionRepository,
} from '../domain/port/mission.repository.js';

// §3.1.3 y §5
export const MISSION_NAME_IN_USE = {
  message: 'Ya existe una misión con ese nombre.',
  code: 'MISSION_NAME_IN_USE',
} as const;

// El mes actual en hora de Argentina, YYYY-MM
export const currentArgentinaMonth = (now: Date): string => toArgentinaDateString(now).slice(0, 7);

// Casos de uso del catálogo de misiones del Administrador. US-28: crear y listar. US-29 agrega
// detalle, editar y dar de baja.
@Injectable()
export class MissionsService {
  constructor(private readonly missionRepository: MissionRepository) {}

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
}
