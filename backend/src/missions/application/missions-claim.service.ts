import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AuditService } from '../../audit/application/audit.service.js';
import { missionRewardClaimedEntry } from '../../audit/domain/audit-entries.js';
import { PointsService } from '../../points/application/points.service.js';
import { claimRejection, MISSION_NOT_CLAIMABLE_CODE, type ClaimedBy } from '../domain/mission-claim.js';
import {
  CustomerMissionRepository,
  CustomerMissionView,
} from '../domain/port/customer-mission.repository.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import { MISSION_NOT_FOUND_MESSAGE } from '../domain/mission.js';

export type ClaimResult = { customerMission: CustomerMissionView; balanceAfter: number };

// US-31 (contrato S5 §3.3.3). Pieza compartida (HISTORIAS_SPRINT_5 §1): reclamar(customerMission, por).
// La usan el Cliente (PATCH /customers/me/misiones/:id/reclamar), US-29 al dar de baja la misión y
// US-32 a fin de mes.
@Injectable()
export class MissionsClaimService {
  constructor(
    private readonly customerMissionRepository: CustomerMissionRepository,
    private readonly pointsService: PointsService,
    private readonly auditService: AuditService,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  // PATCH /customers/me/misiones/:id/reclamar: el reclamo del Cliente, en su propia transacción. Si
  // algo falla (los puntos, la auditoría), la misión queda Completada y no se acredita nada.
  async reclamarDelCliente(customerMissionId: number, customerId: number, now: Date = new Date()): Promise<ClaimResult> {
    return await this.transactionRunner.run(() => this.reclamar(customerMissionId, 'CUSTOMER', { customerId, now }));
  }

  // Corre dentro de la transacción de quien llama (el controller o la baja de la misión). Orden de
  // los bloqueos: la asignación y después customer_points (lo toma acreditarBonificacion), así dos
  // reclamos a la vez se ordenan y el segundo ve la misión Reclamada (409).
  // `customerId`: el cliente del token; si la asignación es de otro, 404 como si no existiera.
  async reclamar(
    customerMissionId: number,
    claimedBy: ClaimedBy,
    options: { customerId?: number; now?: Date } = {},
  ): Promise<ClaimResult> {
    const now = options.now ?? new Date();
    const current = await this.customerMissionRepository.lockById(customerMissionId);
    if (!current || (options.customerId !== undefined && current.customerId !== options.customerId)) {
      throw new NotFoundException(MISSION_NOT_FOUND_MESSAGE);
    }

    const customer = await this.customerMissionRepository.findCustomer(current.customerId);
    if (!customer) throw new NotFoundException(MISSION_NOT_FOUND_MESSAGE);
    // §3.3.3: "Cliente dado de baja con token vivo: 401, como el resto de /customers/me" (decisión de
    // Jazmín: se sigue el contrato). El Sistema reclama igual: nunca se pierde una recompensa ganada.
    if (claimedBy === 'CUSTOMER' && !customer.isActive) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'UNAUTHENTICATED',
      });
    }

    const rejection = claimRejection(current.status, current.rewardPoints);
    if (rejection) throw new ConflictException({ message: rejection, code: MISSION_NOT_CLAIMABLE_CODE });
    // claimRejection garantiza la recompensa
    const points = current.rewardPoints as number;

    const credit = await this.pointsService.acreditarBonificacion({
      customerId: current.customerId,
      type: 'MISSION_REWARD',
      points,
      customerMissionId: current.id,
    });
    const customerMission = await this.customerMissionRepository.markClaimed(current.id, claimedBy, now);

    await this.auditService.record(
      missionRewardClaimedEntry(customer, {
        missionName: current.mission.name,
        points,
        balanceAfter: credit.balanceAfter,
        claimedBy,
      }),
    );
    return { customerMission, balanceAfter: credit.balanceAfter };
  }
}
