import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '../../audit/application/audit.service.js';
import { missionCompletedEntry, type AffectedCustomerSnapshot } from '../../audit/domain/audit-entries.js';
import { MISSION_COMPLETED, type MissionCompletedEvent } from '../../shared/events/domain-events.js';
import { toArgentinaWeekdayAndTime } from '../../shared/time/argentina-date.js';
import {
  advanceProgress,
  incrementFor,
  meetsCondition,
  revertProgress,
  snapshotForMonth,
} from '../domain/mission-progress.js';
import { CustomerMissionRepository } from '../domain/port/customer-mission.repository.js';
import { MissionRepository } from '../domain/port/mission.repository.js';
import { currentArgentinaMonth } from './missions.service.js';

// Lo que missions recibe del consumo (backend/CLAUDE.md §3: missions no importa consumptions). El
// cliente va para el bloque "Cliente afectado" de MISSION_COMPLETED.
export type ConsumptionForMissions = {
  customerId: number;
  consumptionId: number;
  amount: number;
  createdAt: Date;
  customer: AffectedCustomerSnapshot;
};

// Una misión que el consumo completó: para completedMissions de POST /consumos y para mission.completed
export type CompletedMission = MissionCompletedEvent;

// US-30 (contrato S5 §3.2 y S5-21): asignación y avance de las misiones a partir de los consumos. Lo
// usa consumptions dentro de su transacción (consumptions ──> missions, nunca al revés).
@Injectable()
export class MissionsProgressService {
  private readonly logger = new Logger(MissionsProgressService.name);

  constructor(
    private readonly missionRepository: MissionRepository,
    private readonly customerMissionRepository: CustomerMissionRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Dentro de la transacción de POST /consumos, después de acreditar los puntos (customer_points ya
  // está bloqueado, así que dos consumos del mismo cliente no se cruzan). Por cada misión en curso en el
  // mes del consumo: la asigna si el cliente no la tiene (con su snapshot), suma si el consumo cumple
  // la condición del snapshot y, si llega al objetivo, la completa y audita MISSION_COMPLETED (Sistema).
  // Las Completadas, Reclamadas y Vencidas no suman. Si algo falla, se deshace el consumo entero.
  async registrarAvance(consumption: ConsumptionForMissions): Promise<CompletedMission[]> {
    const period = currentArgentinaMonth(consumption.createdAt);
    const running = await this.missionRepository.findRunningInMonth(period);
    if (running.length === 0) return [];

    await this.customerMissionRepository.assignMissing(
      consumption.customerId,
      period,
      running.map((mission) => ({ missionId: mission.id, ...snapshotForMonth(mission, period) })),
    );

    const names = new Map(running.map((mission) => [mission.id, mission.name]));
    const { weekday, time } = toArgentinaWeekdayAndTime(consumption.createdAt);
    const completed: CompletedMission[] = [];

    for (const assignment of await this.customerMissionRepository.lockInProgress(consumption.customerId, period)) {
      const name = names.get(assignment.missionId);
      // Solo las misiones en curso: una dada de baja ya venció sus asignaciones del mes
      if (name === undefined || !meetsCondition(assignment, weekday, time)) continue;

      const next = advanceProgress(
        assignment.progress,
        assignment.target,
        incrementFor(assignment.objectiveType, consumption.amount),
      );
      await this.customerMissionRepository.saveProgress(
        assignment.id,
        next.progress,
        next.completed ? consumption.createdAt : null,
      );
      if (!next.completed) continue;

      await this.auditService.record(
        missionCompletedEntry(consumption.customer, {
          name,
          objectiveType: assignment.objectiveType,
          target: assignment.target,
          period,
        }),
      );
      completed.push({
        customerMissionId: assignment.id,
        missionId: assignment.missionId,
        customerId: consumption.customerId,
        missionName: name,
        rewardPoints: assignment.rewardPoints,
        period,
      });
    }
    return completed;
  }

  // DESPUÉS del commit de POST /consumos: publica mission.completed por cada misión completada, para la
  // notificación de US-50. Si un listener falla, queda en el log: el consumo ya está guardado (§3.8.3).
  async publicarCompletadas(completed: CompletedMission[]): Promise<void> {
    for (const mission of completed) {
      try {
        await this.eventEmitter.emitAsync(MISSION_COMPLETED, mission satisfies MissionCompletedEvent);
      } catch (error) {
        this.logger.error(
          `mission.completed falló para customer_missions ${mission.customerMissionId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  // Dentro de la transacción de la anulación (S5-21): resta lo que el consumo sumó (1 o su monto) solo
  // en las misiones del mismo mes del consumo que sigan En progreso y cuya condición cumplía (se vuelve
  // a evaluar con el snapshot y la fecha del consumo, decisión de Jazmín: no hay vínculo guardado entre
  // consumo y asignación). Sin bajar de 0. Una Completada o Reclamada no se revierte. No se audita: el
  // contrato no lo pide.
  async revertirAvance(consumption: { customerId: number; amount: number; createdAt: Date }): Promise<void> {
    const period = currentArgentinaMonth(consumption.createdAt);
    const { weekday, time } = toArgentinaWeekdayAndTime(consumption.createdAt);

    for (const assignment of await this.customerMissionRepository.lockInProgress(consumption.customerId, period)) {
      if (!meetsCondition(assignment, weekday, time)) continue;
      const progress = revertProgress(assignment.progress, incrementFor(assignment.objectiveType, consumption.amount));
      if (progress !== assignment.progress) {
        await this.customerMissionRepository.saveProgress(assignment.id, progress, null);
      }
    }
  }
}
