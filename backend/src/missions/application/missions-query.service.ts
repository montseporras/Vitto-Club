import { Injectable, NotFoundException } from '@nestjs/common';
import { resolveCompletedPeriod } from '../domain/completed-period.js';
import { sortCustomerMissions } from '../domain/customer-missions-order.js';
import { snapshotForMonth } from '../domain/mission-progress.js';
import { CustomerMissionRepository, CustomerMissionView } from '../domain/port/customer-mission.repository.js';
import { MissionRepository } from '../domain/port/mission.repository.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import { customerUnauthenticated } from './customer-unauthenticated.js';
import { currentArgentinaMonth } from './missions.service.js';

// §3.3.4: lo que ve el personal. Una misión en curso que el cliente todavía no tiene asignada aparece sin
// id (null), con progreso 0 y En progreso.
export type StaffCustomerMission = Omit<CustomerMissionView, 'id'> & { id: number | null };

export const CUSTOMER_NOT_FOUND_MESSAGE = 'No existe el cliente.';

// US-33 (contrato S5 §3.3.2 y §3.3.4): las misiones de un cliente en un mes. `period` sin valor = el mes
// actual; vale el actual y los 11 anteriores, con el mismo mensaje que /misiones/:id/completadas (decisión
// de Jazmín). En un mes anterior se traen todas sus asignaciones, en el estado que tengan.
@Injectable()
export class MissionsQueryService {
  constructor(
    private readonly missionRepository: MissionRepository,
    private readonly customerMissionRepository: CustomerMissionRepository,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  // GET /customers/me/misiones: en el mes actual, primero asigna las en curso que el cliente no tenía
  // (S5-19), con el mismo snapshot que el primer consumo (US-30). Cliente dado de baja con token vivo:
  // 401 (decisión de Jazmín, igual que el reclamo).
  async listMine(customerId: number, period: string | undefined, now: Date = new Date()): Promise<CustomerMissionView[]> {
    const currentMonth = currentArgentinaMonth(now);
    const month = resolveCompletedPeriod(period, currentMonth);
    const customer = await this.customerMissionRepository.findCustomer(customerId);
    if (!customer || !customer.isActive) throw customerUnauthenticated();

    if (month === currentMonth) {
      await this.transactionRunner.run(async () => {
        const running = await this.missionRepository.findRunningInMonth(month);
        await this.customerMissionRepository.assignMissing(
          customerId,
          month,
          running.map((mission) => ({ missionId: mission.id, ...snapshotForMonth(mission, month) })),
        );
      });
    }
    return sortCustomerMissions(await this.customerMissionRepository.findForCustomerPeriod(customerId, month));
  }

  // GET /customers/:id/misiones (Administrador y Cajero): solo lee, NO asigna. En el mes actual suma las
  // en curso que todavía no tiene, sin id. Inexistente → 404; dado de baja → [].
  async listForCustomer(customerId: number, period: string | undefined, now: Date = new Date()): Promise<StaffCustomerMission[]> {
    const currentMonth = currentArgentinaMonth(now);
    const month = resolveCompletedPeriod(period, currentMonth);
    const customer = await this.customerMissionRepository.findCustomer(customerId);
    if (!customer) throw new NotFoundException(CUSTOMER_NOT_FOUND_MESSAGE);
    if (!customer.isActive) return [];

    const assigned: StaffCustomerMission[] = await this.customerMissionRepository.findForCustomerPeriod(customerId, month);
    if (month !== currentMonth) return sortCustomerMissions(assigned);

    const assignedMissionIds = new Set(assigned.map((item) => item.mission.id));
    const missing = (await this.missionRepository.findRunningInMonth(month))
      .filter((mission) => !assignedMissionIds.has(mission.id))
      .map(
        (mission): StaffCustomerMission => ({
          id: null,
          mission: { id: mission.id, name: mission.name, description: mission.description },
          customerId,
          period: month,
          ...snapshotForMonth(mission, month),
          progress: 0,
          status: 'IN_PROGRESS',
          completedAt: null,
          claimedAt: null,
          claimedBy: null,
        }),
      );
    return sortCustomerMissions([...assigned, ...missing]);
  }
}
