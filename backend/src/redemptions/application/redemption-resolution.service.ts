import { ConflictException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../audit/application/audit.service.js';
import { redemptionRejectedEntry } from '../../audit/domain/audit-entries.js';
import { SYSTEM_ACTOR } from '../../audit/domain/audit-entry.js';
import { EmployeesService } from '../../employees/application/employees.service.js';
import { normalizarCodigo } from '../domain/redemption-code.js';
import {
  Redemption,
  REDEMPTION_STATUS_LABELS,
  SYSTEM_RESOLVER,
  type RedemptionResolver,
} from '../domain/redemption.js';
import {
  RedemptionRepository,
  type AutomaticRejectionFilter,
  type RedemptionCustomer,
} from '../domain/port/redemption.repository.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import { RedemptionsExpirationService } from './redemptions-expiration.service.js';

// Códigos y mensajes del contrato S4 (§3.10, §5). El empleado y el Cliente reciben textos distintos.
export const REDEMPTION_NOT_CONFIRMED = 'REDEMPTION_NOT_CONFIRMED';
export const REDEMPTION_EXPIRED = 'REDEMPTION_EXPIRED';

export const REDEMPTION_MESSAGES = {
  // 404 sin code (§5)
  codeNotFound: 'Código no encontrado.',
  customerNotFound: 'No existe el canje.',
  expired: 'El canje venció. El cliente tiene que pedirlo de nuevo.',
  customerExpired: 'El canje ya venció.',
  customerNotConfirmed: 'El canje ya no se puede cancelar.',
} as const;

export const notConfirmedMessage = (redemption: Redemption): string =>
  `El canje ya está en estado "${REDEMPTION_STATUS_LABELS[redemption.getStatus()]}".`;

// §3.10.4: motivos que guarda el Sistema en los rechazos automáticos
export const AUTOMATIC_REJECTION_REASONS = {
  rewardDeactivated: 'Recompensa desactivada',
  rewardDeleted: 'Recompensa eliminada',
  customerDeactivated: 'Cliente dado de baja',
} as const;

export type RejectRedemptionInput = {
  // Lo que escribió el empleado; se normaliza (§3.6.1)
  code: string;
  // Ya recortado y validado por el DTO (5 a 500)
  reason: string;
  actor: { accountId: number; employeeId: number };
};

export type CancelRedemptionInput = {
  code: string;
  // Del token, nunca del body
  customerId: number;
};

export type ResolvedRedemption = { redemption: Redemption; customer: RedemptionCustomer };

const isExpiredConflict = (error: unknown): boolean => {
  if (!(error instanceof HttpException)) return false;
  const body = error.getResponse();
  return typeof body === 'object' && body !== null && (body as { code?: unknown }).code === REDEMPTION_EXPIRED;
};

// US-43 (contrato S4 §3.10): rechazar (empleado), cancelar (Cliente) y rechazo automático (Sistema).
// Ninguno reintegra nada: confirmar no había descontado puntos ni stock (decisión S4-1).
@Injectable()
export class RedemptionResolutionService {
  constructor(
    private readonly redemptionRepository: RedemptionRepository,
    private readonly transactionRunner: TransactionRunner,
    private readonly auditService: AuditService,
    private readonly expiration: RedemptionsExpirationService,
    private readonly employeesService: EmployeesService,
  ) {}

  // PATCH /canjes/:code/rechazar (§3.10.1). Orden de §3.9.1: existe → vence al leer (transacción
  // aparte que se confirma) → Confirmado → REJECTED + auditoría, todo en una transacción.
  async reject(input: RejectRedemptionInput, now: Date = new Date()): Promise<ResolvedRedemption> {
    const code = normalizarCodigo(input.code);
    if (!code) throw new NotFoundException(REDEMPTION_MESSAGES.codeNotFound);

    // Antes de abrir la transacción del caso de uso (CA-44.2)
    if ((await this.expiration.vencerVencidos({ code }, now)) > 0) {
      throw new ConflictException({ message: REDEMPTION_MESSAGES.expired, code: REDEMPTION_EXPIRED });
    }

    return await this.withExpirationOnRace(code, now, async () =>
      this.transactionRunner.run(async () => {
        const redemption = await this.redemptionRepository.lockByCodeForUpdate(code);
        if (!redemption) throw new NotFoundException(REDEMPTION_MESSAGES.codeNotFound);
        if (redemption.getStatus() !== 'CONFIRMED') {
          throw new ConflictException({ message: notConfirmedMessage(redemption), code: REDEMPTION_NOT_CONFIRMED });
        }
        if (redemption.isExpired(now)) {
          throw new ConflictException({ message: REDEMPTION_MESSAGES.expired, code: REDEMPTION_EXPIRED });
        }

        const employee = await this.employeesService.findById(input.actor.employeeId);
        const resolver: RedemptionResolver = {
          accountId: input.actor.accountId,
          name: `${employee.getFirstName()} ${employee.getLastName()}`,
        };
        redemption.reject(input.reason, resolver, now);
        await this.redemptionRepository.saveResolution(redemption);

        const customer = await this.redemptionRepository.findCustomer(redemption.getCustomerId());
        await this.auditService.record(
          redemptionRejectedEntry({ type: 'EMPLOYEE', accountId: input.actor.accountId }, customer, {
            code: redemption.getCode(),
            rewardName: redemption.getRewardName(),
            reason: input.reason,
          }),
        );
        return { redemption, customer };
      }),
    );
  }

  // PATCH /customers/me/canjes/:code/cancelar (§3.10.3). Solo el dueño: si no existe o es de otro
  // cliente, 404 "No existe el canje." (no revela que existe). No se audita.
  async cancel(input: CancelRedemptionInput, now: Date = new Date()): Promise<Redemption> {
    const code = normalizarCodigo(input.code);
    if (!code) throw new NotFoundException(REDEMPTION_MESSAGES.customerNotFound);

    const existing = await this.redemptionRepository.findByCode(code);
    if (!existing || existing.getCustomerId() !== input.customerId) {
      throw new NotFoundException(REDEMPTION_MESSAGES.customerNotFound);
    }

    if ((await this.expiration.vencerVencidos({ code }, now)) > 0) {
      throw new ConflictException({ message: REDEMPTION_MESSAGES.customerExpired, code: REDEMPTION_EXPIRED });
    }

    return await this.withExpirationOnRace(code, now, async () =>
      this.transactionRunner.run(async () => {
        const redemption = await this.redemptionRepository.lockByCodeForUpdate(code);
        if (!redemption) throw new NotFoundException(REDEMPTION_MESSAGES.customerNotFound);
        if (redemption.getStatus() !== 'CONFIRMED') {
          throw new ConflictException({
            message: REDEMPTION_MESSAGES.customerNotConfirmed,
            code: REDEMPTION_NOT_CONFIRMED,
          });
        }
        if (redemption.isExpired(now)) {
          throw new ConflictException({ message: REDEMPTION_MESSAGES.customerExpired, code: REDEMPTION_EXPIRED });
        }

        redemption.cancel(now);
        await this.redemptionRepository.saveResolution(redemption);
        return redemption;
      }),
    );
  }

  // rechazarConfirmados(filtro, motivo) (§3.10.4, CA-43.7): los Confirmados vigentes de una
  // recompensa o de un cliente pasan a REJECTED, resueltos por el Sistema, y se audita cada uno con
  // actor Sistema. Devuelve cuántos rechazó.
  //
  // Corre DENTRO de la transacción de la operación que lo dispara (desactivar o eliminar la
  // recompensa, dar de baja al cliente): si algo falla, se deshace todo. Los Confirmados ya vencidos
  // que el barrido todavía no marcó se vencen primero, en esa misma transacción (no se rechazan).
  async rechazarConfirmados(
    filter: AutomaticRejectionFilter,
    reason: string,
    now: Date = new Date(),
  ): Promise<number> {
    return await this.transactionRunner.run(async () => {
      await this.expiration.vencerVencidos(filter, now);

      const redemptions = await this.redemptionRepository.lockConfirmedForRejection(filter, now);
      const customers = new Map<number, RedemptionCustomer>();
      for (const redemption of redemptions) {
        redemption.reject(reason, SYSTEM_RESOLVER, now);
        await this.redemptionRepository.saveResolution(redemption);

        const customerId = redemption.getCustomerId();
        let customer = customers.get(customerId);
        if (!customer) {
          customer = await this.redemptionRepository.findCustomer(customerId);
          customers.set(customerId, customer);
        }
        await this.auditService.record(
          redemptionRejectedEntry(SYSTEM_ACTOR, customer, {
            code: redemption.getCode(),
            rewardName: redemption.getRewardName(),
            reason,
          }),
        );
      }
      return redemptions.length;
    });
  }

  // Si el canje venció entre el "vencer al leer" y el bloqueo (milisegundos), la transacción del
  // caso de uso responde 409 REDEMPTION_EXPIRED y se deshace; se vence aparte para que quede EXPIRED.
  private async withExpirationOnRace<T>(code: string, now: Date, operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (isExpiredConflict(error)) await this.expiration.vencerVencidos({ code }, now);
      throw error;
    }
  }
}
