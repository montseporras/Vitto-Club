import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../audit/application/audit.service.js';
import {
  redemptionConfirmedEntry,
  redemptionUsedEntry,
  rewardDisabledEntry,
} from '../../audit/domain/audit-entries.js';
import { CustomersService } from '../../customers/application/customers.service.js';
import { Customer } from '../../customers/domain/customer.js';
import { EmployeesService } from '../../employees/application/employees.service.js';
import { InsufficientBalanceError } from '../../points/domain/errors/insufficient-balance.error.js';
import { PointsService } from '../../points/application/points.service.js';
import { RewardsService } from '../../rewards/application/rewards.service.js';
import { crearCanjeConfirmado } from '../domain/new-redemption.js';
import { RedemptionRepository } from '../domain/port/redemption.repository.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import { generarCodigoUnico, normalizarCodigo } from '../domain/redemption-code.js';
import { Redemption, RedemptionStatus } from '../domain/redemption.js';

export type ConfirmInput = {
  customerId: number;
  rewardId: number;
  // null = el propio Cliente desde la app; un empleado = confirma en la caja a nombre del cliente
  confirmedBy: { accountId: number; employeeId: number } | null;
};

export const INSUFFICIENT_BALANCE_MESSAGE =
  'El cliente no tiene saldo suficiente para este canje. Podés rechazarlo.';

export type UseInput = {
  code: string;
  actor: { accountId: number; employeeId: number };
};

export type UseResult = {
  redemption: Redemption;
  balanceBefore: number;
  balanceAfter: number;
};

// §2.3: nombres de estado del canje, para los mensajes de error que los citan (contrato §3.9.1).
const REDEMPTION_STATUS_LABELS: Record<RedemptionStatus, string> = {
  CONFIRMED: 'Confirmado',
  USED: 'Utilizado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Vencido',
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
    private readonly pointsService: PointsService,
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

  // US-42 (§3.9.1). Orden de bloqueos: recompensa → canje → customer_points (este último, dentro
  // de PointsService.canjear).
  // TODO (US-44, todavía sin empezar): falta el paso 2 ("si está CONFIRMED y venció, lo pasa a
  // EXPIRED antes de seguir"). Mientras tanto, un canje vencido sigue viéndose CONFIRMED y se
  // puede usar; CA-42.6 no se cumple hasta que exista esa historia (decisión: avanzar igual con
  // el resto de US-42, a pedido de Montse).
  async usar(input: UseInput): Promise<UseResult> {
    return await this.transactionRunner.run(async () => {
      // Paso 1: el canje existe (lo que escribe el empleado se normaliza igual que en US-41/43)
      const code = normalizarCodigo(input.code);
      const lookup = code ? await this.redemptionRepository.findByCode(code) : null;
      if (!lookup) {
        throw new NotFoundException('Código no encontrado.');
      }

      const reward = await this.rewardsService.lockById(lookup.getRewardId());
      if (!reward) {
        throw new NotFoundException('Código no encontrado.');
      }
      const redemption = await this.redemptionRepository.lockByCode(code as string);
      if (!redemption) {
        throw new NotFoundException('Código no encontrado.');
      }

      // Paso 3: está CONFIRMED
      if (redemption.getStatus() !== 'CONFIRMED') {
        throw new ConflictException({
          message: `El canje ya está en estado "${REDEMPTION_STATUS_LABELS[redemption.getStatus()]}".`,
          code: 'REDEMPTION_NOT_CONFIRMED',
        });
      }

      // Paso 4: el cliente está activo
      const customer = await this.customersService.findById(redemption.getCustomerId());
      this.assertCustomerActive(customer);

      // Paso 5: la recompensa está disponible
      const now = new Date();
      if (!this.rewardsService.isAvailable(reward, now)) {
        throw new ConflictException({
          message: 'La recompensa ya no está disponible. Podés rechazar el canje.',
          code: 'REWARD_NOT_AVAILABLE',
        });
      }

      const employee = await this.employeesService.findById(input.actor.employeeId);
      const resolvedByName = `${employee.getFirstName()} ${employee.getLastName()}`;

      // Pasos 6 y 7: PointsService.canjear ya valida el saldo real y descuenta FIFO
      let credit;
      try {
        credit = await this.pointsService.canjear({
          customerId: redemption.getCustomerId(),
          points: redemption.getPoints(),
          redemptionId: redemption.getId(),
          performedBy: { accountId: input.actor.accountId, name: resolvedByName },
        });
      } catch (error) {
        if (error instanceof InsufficientBalanceError) {
          throw new ConflictException({
            message: INSUFFICIENT_BALANCE_MESSAGE,
            code: 'INSUFFICIENT_BALANCE',
          });
        }
        throw error;
      }

      // Paso 8: usedCount, stock, y DISABLED/OUT_OF_STOCK si llega a 0
      const { disabled } = await this.rewardsService.registerUse(reward);

      // Paso 9: pasa a USED
      redemption.use({
        resolvedByAccountId: input.actor.accountId,
        resolvedByName,
        balanceBefore: credit.balanceBefore,
        balanceAfter: credit.balanceAfter,
        now,
      });
      await this.redemptionRepository.update(redemption);

      // Paso 10: auditoría (a nombre del empleado; si quedó sin stock, también REWARD_DISABLED)
      await this.auditService.record(
        redemptionUsedEntry(
          { type: 'EMPLOYEE', accountId: input.actor.accountId },
          {
            id: customer.getId() as number,
            firstName: customer.getFirstName(),
            lastName: customer.getLastName(),
            documentType: customer.getDocumentType(),
            documentNumber: customer.getDocumentNumber(),
          },
          {
            code: redemption.getCode(),
            rewardName: redemption.getRewardName(),
            points: redemption.getPoints(),
            balanceAfter: credit.balanceAfter,
          },
        ),
      );
      if (disabled) {
        await this.auditService.record(rewardDisabledEntry(reward.getName(), 'OUT_OF_STOCK'));
      }

      return { redemption, balanceBefore: credit.balanceBefore, balanceAfter: credit.balanceAfter };
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
