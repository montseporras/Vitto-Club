import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ACCOUNT_DEACTIVATED } from '../../shared/events/domain-events.js';
import type { AccountDeactivatedEvent } from '../../shared/events/domain-events.js';
import { AuthService } from '../application/auth.service.js';

// Adaptador de entrada, como un controller, pero lo dispara un evento en vez de un pedido
// HTTP. Por eso vive en infrastructure/ y no en application/: el caso de uso no conoce la
// librería de eventos.
@Injectable()
export class AccountDeactivatedListener {
  constructor(private readonly authService: AuthService) {}

  // suppressErrors: false -> si revocar falla, el error llega a quien dio de baja la cuenta
  // y se deshace toda la operación (ver docs/ARCHITECTURE.md).
  @OnEvent(ACCOUNT_DEACTIVATED, { suppressErrors: false })
  async handle(event: AccountDeactivatedEvent): Promise<void> {
    await this.authService.revokeAllSessionsOfAccount(event.accountId);
  }
}
