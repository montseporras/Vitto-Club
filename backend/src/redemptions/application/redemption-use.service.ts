import { ConflictException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../audit/application/audit.service.js';
import { redemptionUsedEntry } from '../../audit/domain/audit-entries.js';
import { EmployeesService } from '../../employees/application/employees.service.js';
import { InsufficientBalanceError } from '../../points/domain/errors/insufficient-balance.error.js';
import { PointsService } from '../../points/application/points.service.js';
import { RewardsAvailabilityService } from '../../rewards/application/rewards-availability.service.js';
import { RewardsService } from '../../rewards/application/rewards.service.js';
import { toArgentinaDateString } from '../../shared/time/argentina-date.js';
import { normalizarCodigo } from '../domain/redemption-code.js';
import { Redemption } from '../domain/redemption.js';
import { RedemptionRepository, type RedemptionCustomer } from '../domain/port/redemption.repository.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import { REDEMPTION_EXPIRED, REDEMPTION_MESSAGES, REDEMPTION_NOT_CONFIRMED, notConfirmedMessage } from './redemption-resolution.service.js';
import { RedemptionsExpirationService } from './redemptions-expiration.service.js';

export const INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE';
export const INSUFFICIENT_BALANCE_MESSAGE = 'El cliente no tiene saldo suficiente para este canje. Podés rechazarlo.';
export const REWARD_NOT_AVAILABLE = 'REWARD_NOT_AVAILABLE';
export const REWARD_NOT_AVAILABLE_MESSAGE = 'La recompensa ya no está disponible. Podés rechazar el canje.';

export type UseRedemptionInput = {
  // Lo que escribió el empleado; se normaliza (§3.6.1)
  code: string;
  actor: { accountId: number; employeeId: number };
};

export type UseRedemptionResult = { redemption: Redemption; customer: RedemptionCustomer; balanceBefore: number; balanceAfter: number };

const isExpiredConflict = (error: unknown): boolean => {
  if (!(error instanceof HttpException)) return false;
  const body = error.getResponse();
  return typeof body === 'object' && body !== null && (body as { code?: unknown }).code === REDEMPTION_EXPIRED;
};

// US-42 (contrato S4 §3.9.1). Orden de bloqueos: recompensa → canje → customer_points (este
// último, dentro de PointsService.canjear). No reintegra nada si falla después del paso 7: hasta
// ahí no se tocó nada.
@Injectable()
export class RedemptionUseService {
  constructor(
    private readonly redemptionRepository: RedemptionRepository,
    private readonly employeesService: EmployeesService,
    private readonly rewardsService: RewardsService,
    private readonly rewardsAvailabilityService: RewardsAvailabilityService,
    private readonly pointsService: PointsService,
    private readonly auditService: AuditService,
    private readonly transactionRunner: TransactionRunner,
    private readonly expiration: RedemptionsExpirationService,
  ) {}

  async use(input: UseRedemptionInput, now: Date = new Date()): Promise<UseRedemptionResult> {
    const code = normalizarCodigo(input.code);
    if (!code) throw new NotFoundException(REDEMPTION_MESSAGES.codeNotFound);

    // Paso 2, antes de abrir la transacción del caso de uso (CA-44.2)
    if ((await this.expiration.vencerVencidos({ code }, now)) > 0) {
      throw new ConflictException({ message: REDEMPTION_MESSAGES.expired, code: REDEMPTION_EXPIRED });
    }

    return await this.withExpirationOnRace(code, now, async () =>
      this.transactionRunner.run(async () => {
        // Orden de bloqueos: recompensa primero. Se necesita el rewardId del canje (sin bloquear)
        // para saber cuál bloquear.
        const lookup = await this.redemptionRepository.findByCode(code);
        if (!lookup) throw new NotFoundException(REDEMPTION_MESSAGES.codeNotFound);

        const reward = await this.rewardsService.lockForUpdate(lookup.getRewardId());
        if (!reward) throw new NotFoundException(REDEMPTION_MESSAGES.codeNotFound);

        const redemption = await this.redemptionRepository.lockByCodeForUpdate(code);
        if (!redemption) throw new NotFoundException(REDEMPTION_MESSAGES.codeNotFound);

        // Paso 3: está CONFIRMED
        if (redemption.getStatus() !== 'CONFIRMED') {
          throw new ConflictException({ message: notConfirmedMessage(redemption), code: REDEMPTION_NOT_CONFIRMED });
        }
        if (redemption.isExpired(now)) {
          throw new ConflictException({ message: REDEMPTION_MESSAGES.expired, code: REDEMPTION_EXPIRED });
        }

        // Paso 4: el cliente está activo
        const customerStatus = await this.redemptionRepository.findCustomerStatus(redemption.getCustomerId());
        if (!customerStatus?.isActive) {
          throw new ConflictException({ message: 'El cliente está dado de baja.', code: 'CUSTOMER_INACTIVE' });
        }

        // Paso 5: la recompensa está disponible. Lectura pura: no deshabilita nada acá (eso es
        // del paso 8, cuando el uso mismo le hace llegar el stock a 0).
        if (!this.rewardsService.isAvailable(reward, now)) {
          throw new ConflictException({ message: REWARD_NOT_AVAILABLE_MESSAGE, code: REWARD_NOT_AVAILABLE });
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
            throw new ConflictException({ message: INSUFFICIENT_BALANCE_MESSAGE, code: INSUFFICIENT_BALANCE });
          }
          throw error;
        }

        // Paso 8: usedCount, stock y DISABLED/OUT_OF_STOCK si llega a 0
        await this.rewardsService.recordUse(reward);
        await this.rewardsAvailabilityService.reevaluarDisponibilidad(reward, toArgentinaDateString(now));

        // Paso 9: pasa a USED
        redemption.use({
          resolvedByAccountId: input.actor.accountId,
          resolvedByName,
          balanceBefore: credit.balanceBefore,
          balanceAfter: credit.balanceAfter,
          now,
        });
        await this.redemptionRepository.saveUse(redemption);

        // Paso 10: auditoría, a nombre del empleado
        const customer = await this.redemptionRepository.findCustomer(redemption.getCustomerId());
        await this.auditService.record(
          redemptionUsedEntry({ type: 'EMPLOYEE', accountId: input.actor.accountId }, customer, {
            code: redemption.getCode(),
            rewardName: redemption.getRewardName(),
            points: redemption.getPoints(),
            balanceAfter: credit.balanceAfter,
          }),
        );

        return { redemption, customer, balanceBefore: credit.balanceBefore, balanceAfter: credit.balanceAfter };
      }),
    );
  }

  // Si el canje venció entre el "vencer al leer" y el bloqueo (milisegundos), la transacción del
  // caso de uso responde 409 REDEMPTION_EXPIRED y se deshace; se vence aparte para que quede
  // EXPIRED (mismo patrón que RedemptionResolutionService).
  private async withExpirationOnRace<T>(code: string, now: Date, operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (isExpiredConflict(error)) await this.expiration.vencerVencidos({ code }, now);
      throw error;
    }
  }
}
