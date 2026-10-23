import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CustomersService } from '../../customers/application/customers.service.js';
import {
  ACCOUNT_PASSWORD_CHANGED,
  type AccountPasswordChangedEvent,
  type CustomerEmailChangeRequestedEvent,
} from '../../shared/events/domain-events.js';
import { currentPasswordIncorrect } from '../domain/errors/current-password-incorrect.error.js';
import { profileEmailInUse } from '../domain/errors/email-in-use.error.js';
import { checkNewPassword } from '../domain/password-policy.js';
import { AccountCredentialsRepository } from '../domain/port/account-credentials.repository.js';
import type { AccountCredentials } from '../domain/port/account-credentials.repository.js';
import { PasswordAttemptLimiter } from '../domain/port/password-attempt-limiter.js';
import { PasswordHasher } from '../domain/port/password-hasher.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';

export type ChangeOwnPasswordInput = {
  accountId: number;
  currentPassword: string;
  newPassword: string;
  // Valor de la cookie refresh_token del pedido: la sesión que sigue abierta
  currentRefreshToken?: string;
};

// PERFIL: el dueño de una cuenta (de cualquier rol) confirma su contraseña actual para cambiar la
// contraseña (contrato §3.11.1) o el correo de acceso (§3.10.4). Los dos usan el mismo contador de
// intentos incorrectos.
@Injectable()
export class PasswordChangeService {
  constructor(
    private readonly credentials: AccountCredentialsRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly attemptLimiter: PasswordAttemptLimiter,
    private readonly customersService: CustomersService,
    private readonly transactionRunner: TransactionRunner,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // PATCH /mi-cuenta/password. Todo en una transacción; si algo falla no queda nada escrito.
  // Orden de las validaciones (decisión a pedido de Magali): primero la contraseña actual, después la
  // política de la nueva.
  async changeOwnPassword(input: ChangeOwnPasswordInput): Promise<void> {
    await this.transactionRunner.run(async () => {
      const account = await this.credentials.findActiveById(input.accountId);
      if (!account) throw unauthenticated();

      await this.confirmCurrentPassword(account, input.currentPassword);

      const violation = checkNewPassword({
        newPassword: input.newPassword,
        currentPassword: input.currentPassword,
        accountEmail: account.email,
        documentNumber: await this.documentNumberOf(account),
      });
      if (violation) {
        throw new BadRequestException({
          message: violation.message,
          ...(violation.code ? { code: violation.code } : {}),
        });
      }

      await this.credentials.updatePassword(account.accountId, await this.passwordHasher.hash(input.newPassword));

      // auth cierra las otras sesiones de la cuenta (la actual sigue abierta)
      await this.eventEmitter.emitAsync(ACCOUNT_PASSWORD_CHANGED, {
        accountId: account.accountId,
        currentRefreshToken: input.currentRefreshToken,
      } satisfies AccountPasswordChangedEvent);
    });
  }

  // customer.email-change-requested (PATCH /customers/me con un correo nuevo). Corre en la
  // transacción de customers, antes de que escriba nada: si tira, no se guarda ningún cambio.
  async handleCustomerEmailChangeRequested(event: CustomerEmailChangeRequestedEvent): Promise<void> {
    const account = await this.credentials.findActiveByCustomerId(event.customerId);
    if (!account) throw unauthenticated();

    await this.confirmCurrentPassword(account, event.currentPassword);

    const email = event.email.trim().toLowerCase();
    if (await this.credentials.existsActiveByEmail(email, account.accountId)) {
      throw profileEmailInUse();
    }
  }

  // Aplica el límite de intentos y verifica la contraseña. El intento incorrecto se anota ANTES de
  // tirar el error y fuera de la base (ver InMemoryPasswordAttemptLimiter), así que el rollback de la
  // transacción no lo borra.
  private async confirmCurrentPassword(account: AccountCredentials, currentPassword: string): Promise<void> {
    const now = new Date();
    this.attemptLimiter.assertNotBlocked(account.accountId, now);

    const matches = await this.passwordHasher.verify(currentPassword, account.passwordHash);
    if (!matches) {
      this.attemptLimiter.recordFailure(account.accountId, now);
      throw currentPasswordIncorrect();
    }
  }

  // Solo las cuentas de cliente tienen documento (contrato §3.11, "distinta del documento")
  private async documentNumberOf(account: AccountCredentials): Promise<string | undefined> {
    if (account.customerId === null) return undefined;
    return (await this.customersService.findById(account.customerId)).getDocumentNumber();
  }
}

function unauthenticated(): UnauthorizedException {
  return new UnauthorizedException({
    statusCode: 401,
    error: 'Unauthorized',
    message: 'Authentication required',
    code: 'UNAUTHENTICATED',
  });
}
