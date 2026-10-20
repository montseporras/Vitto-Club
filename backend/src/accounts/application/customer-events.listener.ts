import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AccountsService } from './accounts.service.js';
import { CustomerAccountCreationService } from './customer-account-creation.service.js';
import { CustomerAccountSyncService } from './customer-account-sync.service.js';
import {
  CUSTOMER_CREATED,
  CUSTOMER_DEACTIVATED,
  CUSTOMER_DOCUMENT_CHANGED,
  CUSTOMER_EMAIL_CHANGED,
  type CustomerCreatedEvent,
  type CustomerDeactivatedEvent,
  type CustomerDocumentChangedEvent,
  type CustomerEmailChangedEvent,
} from '../../shared/events/domain-events.js';

// Reacciona a lo que pasa en customers sin que customers conozca a accounts (ver
// docs/ARCHITECTURE.md, "Eventos de dominio"). suppressErrors: false es obligatorio: sin
// eso, un error acá no se propaga y la transacción de quien publicó sigue como si nada.
//
// Se escuchan el alta (customer.created: crea la cuenta), el cambio de email, la baja
// (customer.deactivated: deja inactiva la cuenta y cierra sus sesiones) y la corrección del
// documento (customer.document-changed: contraseña inicial). El login igual lee el estado
// directamente de Customer (ver AccountsService.toCustomerAuthInfo). La reactivación de clientes
// ya no existe (CLI-ADM).
@Injectable()
export class CustomerEventsListener {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly customerAccountCreation: CustomerAccountCreationService,
    private readonly customerAccountSync: CustomerAccountSyncService,
  ) {}

  @OnEvent(CUSTOMER_DEACTIVATED, { suppressErrors: false })
  async onCustomerDeactivated(event: CustomerDeactivatedEvent): Promise<void> {
    await this.customerAccountSync.handleCustomerDeactivated(event);
  }

  @OnEvent(CUSTOMER_DOCUMENT_CHANGED, { suppressErrors: false })
  async onCustomerDocumentChanged(event: CustomerDocumentChangedEvent): Promise<void> {
    await this.customerAccountSync.handleCustomerDocumentChanged(event);
  }

  @OnEvent(CUSTOMER_CREATED, { suppressErrors: false })
  async onCustomerCreated(event: CustomerCreatedEvent): Promise<void> {
    await this.customerAccountCreation.handleCustomerCreated(event);
  }

  @OnEvent(CUSTOMER_EMAIL_CHANGED, { suppressErrors: false })
  async onCustomerEmailChanged(event: CustomerEmailChangedEvent): Promise<void> {
    await this.accountsService.handleCustomerEmailChanged(event);
  }
}
