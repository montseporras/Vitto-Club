import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../audit/application/audit.service.js';
import { redemptionConfirmedEntry } from '../../audit/domain/audit-entries.js';
import { EmployeesService } from '../../employees/application/employees.service.js';
import { RewardsService } from '../../rewards/application/rewards.service.js';
import { crearCanjeConfirmado } from '../domain/new-redemption.js';
import { Redemption } from '../domain/redemption.js';
import { RedemptionRepository, type RedemptionCustomer } from '../domain/port/redemption.repository.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import { generarCodigoUnico } from '../domain/redemption-code.js';

export type ConfirmRedemptionInput = {
  customerId: number;
  rewardId: number;
  // null = el propio Cliente desde la app; un empleado = confirma en la caja a nombre del cliente
  confirmedBy: { accountId: number; employeeId: number } | null;
};

export type ConfirmedRedemption = { redemption: Redemption; customer: RedemptionCustomer };

// US-40 (contrato S4 §3.7.1). Confirmar NO descuenta nada (decisión S4-1): eso pasa al registrar
// el uso (US-42). Todo va en la transacción ambiente: si la auditoría falla, tampoco queda el canje.
@Injectable()
export class RedemptionConfirmationService {
  constructor(
    private readonly redemptionRepository: RedemptionRepository,
    private readonly employeesService: EmployeesService,
    private readonly rewardsService: RewardsService,
    private readonly auditService: AuditService,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async confirm(input: ConfirmRedemptionInput, now: Date = new Date()): Promise<ConfirmedRedemption> {
    return await this.transactionRunner.run(async () => {
      // Paso 2: el cliente existe y está activo. El saldo no se valida acá (decisión S4-2).
      const customerStatus = await this.redemptionRepository.findCustomerStatus(input.customerId);
      if (!customerStatus) {
        throw new NotFoundException('No existe el cliente.');
      }
      if (!customerStatus.isActive) {
        throw new ConflictException({ message: 'El cliente está dado de baja.', code: 'CUSTOMER_INACTIVE' });
      }

      // Paso 3: la recompensa existe, no está dada de baja y está disponible. Se toma con
      // FOR UPDATE (contrato S5 §4: "al confirmar un canje: la recompensa"): así no se cuela un
      // canje mientras otra operación baja el stock o desactiva la recompensa. No deshabilita
      // nada acá (eso es de US-37, el proceso diario o cuando se usa un canje).
      const reward = await this.rewardsService.lockForUpdate(input.rewardId);
      if (!reward || reward.getStatus() === 'DELETED') {
        throw new NotFoundException('No existe la recompensa.');
      }
      if (!this.rewardsService.isAvailable(reward, now)) {
        throw new ConflictException({
          message: 'La recompensa ya no está disponible.',
          code: 'REWARD_NOT_AVAILABLE',
        });
      }

      // El nombre del empleado queda como foto del momento (confirmedByName)
      let confirmedBy: { accountId: number; name: string } | null = null;
      if (input.confirmedBy) {
        const employee = await this.employeesService.findById(input.confirmedBy.employeeId);
        confirmedBy = {
          accountId: input.confirmedBy.accountId,
          name: `${employee.getFirstName()} ${employee.getLastName()}`,
        };
      }

      const code = await generarCodigoUnico((candidate) => this.redemptionRepository.existsByCode(candidate));
      const saved = await this.redemptionRepository.create(
        crearCanjeConfirmado({
          code,
          customerId: input.customerId,
          reward: { id: reward.getId(), name: reward.getName(), points: reward.getPoints() },
          confirmedBy,
          now,
        }),
      );

      const customer = await this.redemptionRepository.findCustomer(input.customerId);

      // Solo se audita desde la caja, a nombre del empleado. Desde la app no: el Cliente nunca
      // es actor (decisión S4-6).
      if (confirmedBy) {
        await this.auditService.record(
          redemptionConfirmedEntry(
            { type: 'EMPLOYEE', accountId: confirmedBy.accountId },
            customer,
            { code: saved.getCode(), rewardName: saved.getRewardName(), points: saved.getPoints() },
          ),
        );
      }

      return { redemption: saved, customer };
    });
  }
}
