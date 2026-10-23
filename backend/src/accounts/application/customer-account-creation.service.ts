import { Injectable } from '@nestjs/common';
import { CustomerAccountRepository } from '../domain/port/customer-account.repository.js';
import { PasswordHasher } from '../domain/port/password-hasher.js';
import { emailInUse } from '../domain/errors/email-in-use.error.js';
import type { CustomerCreatedEvent } from '../../shared/events/domain-events.js';

// US-17-AJ: cuenta del cliente que el Cajero o el Administrador dieron de alta. Reacciona a
// customer.created, que customers publica dentro de su transacción (ver customer-events.listener.ts).
// Es un servicio aparte del autorregistro (CustomerRegistrationService): ahí el cliente elige su
// contraseña y la cuenta nace con mustChangePassword = false.
@Injectable()
export class CustomerAccountCreationService {
  constructor(
    private readonly customerAccounts: CustomerAccountRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  // Corre en la transacción de quien publicó: si tira, se deshace también el cliente.
  async handleCustomerCreated(event: CustomerCreatedEvent): Promise<void> {
    const email = event.email.trim().toLowerCase();

    // El email puede estar en una cuenta inactiva (se puede repetir); solo cuenta una activa.
    // findByEmail devuelve primero la activa, así que alcanza con mirar esa.
    const existing = await this.customerAccounts.findByEmail(email);
    if (existing !== null && existing.active) {
      throw emailInUse();
    }

    // La contraseña inicial es el documento ya normalizado. NO pasa por Password.create: es
    // temporal, la crea el sistema y un DNI de 7 dígitos no cumple el mínimo de 8 caracteres.
    // El valor no se guarda ni se audita; solo su hash.
    const passwordHash = await this.passwordHasher.hash(event.documentNumber);

    await this.customerAccounts.create({
      customerId: event.customerId,
      email,
      passwordHash,
      mustChangePassword: true,
    });
  }
}
