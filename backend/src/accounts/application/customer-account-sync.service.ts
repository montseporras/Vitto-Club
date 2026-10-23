import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CustomerAccountRepository } from '../domain/port/customer-account.repository.js';
import { PasswordHasher } from '../domain/port/password-hasher.js';
import {
  ACCOUNT_DEACTIVATED,
  type AccountDeactivatedEvent,
  type CustomerDeactivatedEvent,
  type CustomerDocumentChangedEvent,
} from '../../shared/events/domain-events.js';

// CLI-ADM: mantiene la cuenta del cliente al día con lo que pasa en customers (baja y corrección de
// documento). Corre en la transacción de quien publicó el evento: si tira, se deshace también el
// cambio en Customer.
@Injectable()
export class CustomerAccountSyncService {
  constructor(
    private readonly customerAccounts: CustomerAccountRepository,
    private readonly passwordHasher: PasswordHasher,
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

  // Contrato §3.8.2: si el cliente todavía no cambió la contraseña inicial, su contraseña pasa a ser
  // el documento nuevo. Si ya la cambió, el repositorio no toca nada. Como en el alta, el documento
  // NO pasa por Password.create (es temporal y un DNI de 7 dígitos no llega al mínimo de 8) y solo se
  // guarda su hash.
  async handleCustomerDocumentChanged(event: CustomerDocumentChangedEvent): Promise<void> {
    const passwordHash = await this.passwordHasher.hash(event.documentNumber);
    await this.customerAccounts.replaceInitialPasswordHash(event.customerId, passwordHash);
  }
}
