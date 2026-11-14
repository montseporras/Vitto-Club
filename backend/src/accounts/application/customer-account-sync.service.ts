import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CustomerAccountRepository } from '../domain/port/customer-account.repository.js';
import {
  ACCOUNT_DEACTIVATED,
  type AccountDeactivatedEvent,
  type CustomerDeactivatedEvent,
} from '../../shared/events/domain-events.js';

// CLI-ADM: mantiene la cuenta del cliente al día con lo que pasa en customers (la baja). Corre en la
// transacción de quien publicó el evento: si tira, se deshace también el cambio en Customer.
@Injectable()
export class CustomerAccountSyncService {
  constructor(
    private readonly customerAccounts: CustomerAccountRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Contrato §3.8.3: la cuenta queda inactiva y se cierran sus sesiones. Esto último lo hace auth al
  // escuchar account.deactivated, igual que cuando se da de baja la cuenta de un empleado.
  async handleCustomerDeactivated(event: CustomerDeactivatedEvent): Promise<void> {
    const accountId = await this.customerAccounts.deactivateByCustomerId(event.customerId);
    if (accountId === null) return; // un cliente puede existir sin cuenta

    await this.eventEmitter.emitAsync(ACCOUNT_DEACTIVATED, {
      accountId,
    } satisfies AccountDeactivatedEvent);
  }
}
