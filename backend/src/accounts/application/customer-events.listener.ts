import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AccountsService } from './accounts.service.js';
import {
  CUSTOMER_EMAIL_CHANGED,
  type CustomerEmailChangedEvent,
} from '../../shared/events/domain-events.js';

// Reacciona a lo que pasa en customers sin que customers conozca a accounts (ver
// docs/ARCHITECTURE.md, "Eventos de dominio"). suppressErrors: false es obligatorio: sin
// eso, un error acá no se propaga y la transacción de quien publicó sigue como si nada.
//
// Solo se escucha el cambio de email. La baja y la reactivación de un cliente NO se
// sincronizan: el login lee el estado directamente de Customer (ver
// AccountsService.toCustomerAuthInfo), así que no hay nada que mantener en la cuenta.
@Injectable()
export class CustomerEventsListener {
  constructor(private readonly accountsService: AccountsService) {}

  @OnEvent(CUSTOMER_EMAIL_CHANGED, { suppressErrors: false })
  async onCustomerEmailChanged(event: CustomerEmailChangedEvent): Promise<void> {
    await this.accountsService.handleCustomerEmailChanged(event);
  }
}
