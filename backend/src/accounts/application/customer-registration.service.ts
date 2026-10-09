import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { CustomersService } from '../../customers/application/customers.service.js';
import { EmployeesService } from '../../employees/application/employees.service.js';
import { Password } from '../domain/password.js';
import { PasswordHasher } from '../domain/port/password-hasher.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import { CustomerAccountRepository } from '../domain/port/customer-account.repository.js';

// SCRUM-160: datos del autorregistro de un cliente (los de RF-015 más la contraseña)
export type RegisterCustomerInput = {
  firstName: string;
  lastName: string;
  documentType: 'DNI' | 'PASSPORT';
  documentNumber: string;
  email: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  password: string;
};

export type RegisteredCustomer = {
  customerId: number;
  email: string;
  firstName: string;
  lastName: string;
};

// Mensajes del registro (decisión del PO, 2026-10-08): dicen qué dato está repetido y
// sugieren comunicarse con el restaurante. Van en español porque los muestra el frontend.
// La pantalla de registro reconoce el campo repetido por el texto del 409: la palabra
// "email" marca el email, y el tipo de documento ("DNI" o "PASSPORT") marca el documento.
// Por eso el del documento lleva el tipo, y el de la carrera no nombra ninguno de los dos.
const CONTACT_HINT = 'Ante cualquier duda, comunicate con el restaurante.';
export const registrationDocumentTaken = (documentType: 'DNI' | 'PASSPORT') =>
  `Ya hay un cliente registrado con ese documento (${documentType}). ${CONTACT_HINT}`;
export const REGISTRATION_EMAIL_TAKEN = `Ya hay una cuenta registrada con ese email. ${CONTACT_HINT}`;
export const REGISTRATION_DATA_TAKEN = `Esos datos ya están registrados. ${CONTACT_HINT}`;

function registrationConflict(field: 'documentNumber' | 'email', message: string): ConflictException {
  return new ConflictException({ message, details: [{ field, message }] });
}

// SCRUM-160: autorregistro de clientes. Vive en accounts (no en customers) porque accounts es
// dueño de las cuentas y las contraseñas, y customers no puede depender de accounts (sería un
// ciclo: accounts ya depende de customers). Es un servicio aparte de AccountsService, que
// queda solo para el ABMC de usuarios y el login.
@Injectable()
export class CustomerRegistrationService {
  constructor(
    private readonly customerAccounts: CustomerAccountRepository,
    private readonly customersService: CustomersService,
    private readonly employeesService: EmployeesService,
    private readonly passwordHasher: PasswordHasher,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  // Crea el cliente y su cuenta CUSTOMER en una sola transacción. No inicia sesión: después el
  // cliente entra por /api/auth/login con su email y su contraseña.
  async register(input: RegisterCustomerInput): Promise<RegisteredCustomer> {
    const email = input.email.trim().toLowerCase();

    // 1. Contraseña: 8 a 64 caracteres, hasta 72 bytes y distinta del email (comparación
    //    literal, mismo criterio que las cuentas de empleados)
    const password = Password.create(input.password);
    if (password.getValue() === email) {
      throw new BadRequestException('Password cannot be the same as the email');
    }

    // 2. Documento y email libres. Solo cuentan los clientes activos: uno dado de baja perdió
    //    sus puntos y su cuenta, así que puede volver a registrarse (decisión del PO).
    if (await this.customersService.existsByDocument(input.documentType, input.documentNumber)) {
      throw registrationConflict('documentNumber', registrationDocumentTaken(input.documentType));
    }
    const account = await this.customerAccounts.findByEmail(email);
    const emailTaken =
      (await this.customersService.existsActiveByEmail(email)) ||
      (await this.employeesService.existsByEmail(email)) ||
      (account !== null && account.employeeId !== null);
    if (emailTaken) {
      throw registrationConflict('email', REGISTRATION_EMAIL_TAKEN);
    }

    // Si el email todavía figura en la cuenta de un cliente dado de baja, esa cuenta se libera
    // (se desactiva) dentro de la misma transacción del registro
    const previousAccountId = account !== null && account.active ? account.accountId : null;

    // 3. Hash ANTES de abrir la transacción: bcrypt es lento y no conviene tenerla abierta
    const passwordHash = await this.passwordHasher.hash(password.getValue());

    // 4. Cliente + cuenta, todo o nada: si falla la cuenta no queda el cliente, y viceversa
    try {
      return await this.transactionRunner.run(async () => {
        if (previousAccountId !== null) {
          await this.customerAccounts.deactivate(previousAccountId);
        }

        const customer = await this.customersService.create({
          firstName: input.firstName,
          lastName: input.lastName,
          documentType: input.documentType,
          documentNumber: input.documentNumber,
          email,
          phone: input.phone,
          dateOfBirth: input.dateOfBirth,
        });
        const customerId = customer.getId() as number;

        await this.customerAccounts.create({ customerId, email: customer.getEmail(), passwordHash });

        return {
          customerId,
          email: customer.getEmail(),
          firstName: customer.getFirstName(),
          lastName: customer.getLastName(),
        };
      });
    } catch (error) {
      // Otro registro con los mismos datos ganó la carrera entre el chequeo y la escritura:
      // customers responde 409 con su propio mensaje; se reemplaza por el del registro.
      if (error instanceof ConflictException) {
        throw new ConflictException(REGISTRATION_DATA_TAKEN);
      }
      throw error;
    }
  }
}
