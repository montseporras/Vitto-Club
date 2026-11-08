import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../audit/application/audit.service.js';
import { redemptionConfirmedEntry } from '../../audit/domain/audit-entries.js';
import { CustomersService } from '../../customers/application/customers.service.js';
import { Customer } from '../../customers/domain/customer.js';
import { EmployeesService } from '../../employees/application/employees.service.js';
import { RewardsService } from '../../rewards/application/rewards.service.js';
import { crearCanjeConfirmado } from '../domain/new-redemption.js';
import { RedemptionRepository } from '../domain/port/redemption.repository.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import { generarCodigoUnico } from '../domain/redemption-code.js';
import { Redemption } from '../domain/redemption.js';

export type ConfirmInput = {
  customerId: number;
  rewardId: number;
  // null = el propio Cliente desde la app; un empleado = confirma en la caja a nombre del cliente
  confirmedBy: { accountId: number; employeeId: number } | null;
};

// US-40. Confirmar un canje (§3.7.1). NO descuenta saldo, lotes, movimientos ni stock (decisión
// S4-1): eso pasa al registrar el uso (US-42). Todo va en la transacción ambiente: si la
// auditoría falla, tampoco queda el canje.
@Injectable()
export class RedemptionsService {
  constructor(
    private readonly redemptionRepository: RedemptionRepository,
    private readonly customersService: CustomersService,
    private readonly employeesService: EmployeesService,
    private readonly rewardsService: RewardsService,
    private readonly auditService: AuditService,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async confirm(input: ConfirmInput): Promise<Redemption> {
    return await this.transactionRunner.run(async () => {
      // Paso 2: el cliente existe y está activo (404 / 409 CUSTOMER_INACTIVE). El saldo no se
      // valida acá (decisión S4-2).
      const customer = await this.customersService.findById(input.customerId);
      this.assertCustomerActive(customer);

      // Paso 3: la recompensa existe, no está dada de baja y está disponible
      const reward = await this.rewardsService.findById(input.rewardId);
      if (!reward || reward.getStatus() === 'DELETED') {
        throw new NotFoundException('No existe la recompensa.');
      }
      const now = new Date();
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

      // Solo se audita desde la caja, a nombre del empleado. Desde la app no: el Cliente nunca
      // es actor (decisión S4-6).
      if (confirmedBy) {
        await this.auditService.record(
          redemptionConfirmedEntry(
            { type: 'EMPLOYEE', accountId: confirmedBy.accountId },
            {
              id: customer.getId() as number,
              firstName: customer.getFirstName(),
              lastName: customer.getLastName(),
              documentType: customer.getDocumentType(),
              documentNumber: customer.getDocumentNumber(),
            },
            { code: saved.getCode(), rewardName: saved.getRewardName(), points: saved.getPoints() },
          ),
        );
      }

      return saved;
    });
  }

  private assertCustomerActive(customer: Customer): void {
    if (!customer.isActive()) {
      throw new ConflictException({
        message: 'El cliente está dado de baja.',
        code: 'CUSTOMER_INACTIVE',
      });
    }
  }
}
