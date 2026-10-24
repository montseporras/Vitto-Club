import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ACCOUNT_PASSWORD_CHANGED } from '../../shared/events/domain-events.js';
import type { AccountPasswordChangedEvent } from '../../shared/events/domain-events.js';
import { AuthService } from '../application/auth.service.js';

// PERFIL (contrato §3.11.1, paso 5): al cambiar la contraseña se cierran las otras sesiones de la
// cuenta y la actual sigue abierta. Igual que AccountDeactivatedListener, corre en la transacción de
// quien publicó el evento: si falla, la contraseña no cambia.
@Injectable()
export class AccountPasswordChangedListener {
  constructor(private readonly authService: AuthService) {}

  @OnEvent(ACCOUNT_PASSWORD_CHANGED, { suppressErrors: false })
  async handle(event: AccountPasswordChangedEvent): Promise<void> {
    await this.authService.revokeOtherSessionsOfAccount(event.accountId, event.currentRefreshToken);
  }
}
