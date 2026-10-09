import { randomBytes } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Employee } from '../../employees/domain/employee.js';
import { EmployeesService } from '../../employees/application/employees.service.js';
import { CustomersService } from '../../customers/application/customers.service.js';
import { Account } from '../domain/account.js';
import { Password } from '../domain/password.js';
import { AccountRole } from '../domain/account-role.js';
import { AccountRepository } from '../domain/port/account.repository.js';
import { PasswordHasher } from '../domain/port/password-hasher.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import { AccountAlreadyExists } from '../domain/errors/account-already-exists.error.js';
import {
  ACCOUNT_DEACTIVATED,
  type AccountDeactivatedEvent,
  type CustomerEmailChangedEvent,
  type EmployeeRoleChangedEvent,
} from '../../shared/events/domain-events.js';

// Entrada de cada caso de uso. No son DTOs HTTP (esa capa todavía no existe para este
// módulo): son el contrato que el futuro controller deberá armar a partir del body.
export type RegisterAccountInput = {
  employeeId: number;
  email: string;
  password: string;
};

// Vista de consulta (US-08). El email se lee de Employee (fuente de verdad única). El rol
// es el de accounts (AccountRole), sincronizado desde Employee.role vía evento.
// passwordHash nunca aparece acá ni en ningún otro lugar fuera de Account/AccountRepository.
export type AccountProfile = {
  accountId: number;
  employeeId: number;
  email: string;
  role: AccountRole;
  active: boolean;
};

// Dueño de una Account: hoy este módulo solo resuelve cuentas de Employee, pero el tipo ya
// admite Customer (identifier = su documento) para que auth tenga un único contrato de
// login sin dos formas de resultado distintas según el tipo de cuenta.
export type AccountOwner = { employeeId: number } | { customerId: number };

// Rol que ve el login. AccountRole (ADMIN/CASHIER) sigue siendo el de las cuentas de
// empleado y el que validan los DTOs del ABMC; CUSTOMER existe solo para el login de clientes.
export type LoginRole = AccountRole | 'CUSTOMER';

// Resultado de verifyCredentials/findActiveById (consumido por auth para construir la
// sesión/JWT, y para que el refresh devuelva la misma forma que el login). Nunca incluye
// passwordHash, password, token ni session. email sale directo de Account.email, ya
// normalizado (trim + lowercase) desde que se persistió — no hace falta volver a resolver
// Employee/Customer solo para esto.
// firstName/lastName: para mostrar "Nombre Apellido · Rol" en el encabezado del frontend. Se
// leen de Employee o de Customer en cada login y renovación (no van dentro del access token).
export type AuthAccountInfo = {
  accountId: number;
  role: LoginRole;
  owner: AccountOwner;
  email: string;
  firstName: string;
  lastName: string;
};

@Injectable()
export class AccountsService {
  constructor(
    private readonly accountsRepository: AccountRepository,
    // Ya no hay ciclo Accounts<->Employees (ver employees.service.ts: Employees no conoce
    // a Accounts), así que esta dependencia puede tipar la clase concreta sin forwardRef.
    private readonly employeesService: EmployeesService,
    private readonly customersService: CustomersService,
    private readonly passwordHasher: PasswordHasher,
    private readonly transactionRunner: TransactionRunner,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // --- US-05: REGISTRAR USUARIO ---
  async register(input: RegisterAccountInput): Promise<Account> {
    // 1. El empleado debe existir (404 si no) y estar activo
    const employee = await this.employeesService.findById(input.employeeId);
    if (!employee.isActive()) {
      throw new ConflictException(
        `Employee with ID ${input.employeeId} is inactive and cannot have an account`,
      );
    }

    // 2. Como mucho una cuenta por empleado
    if (await this.accountsRepository.existsByEmployeeId(input.employeeId)) {
      throw new ConflictException(new AccountAlreadyExists(input.employeeId).message);
    }

    // 3. Account no tiene columna propia de email en nuestro dominio: el email de acceso es
    // el de Employee. Si el request manda uno distinto, se rechaza (400: dato de entrada
    // incorrecto, no un conflicto de recursos).
    const normalizedEmail = input.email.trim().toLowerCase();
    if (normalizedEmail !== employee.getEmail()) {
      throw new BadRequestException("The email must match the associated employee's email");
    }

    // 4. Unicidad global de email: contra otros empleados ya está garantizada (se valida
    // al crear el Employee). Falta la verificación cruzada contra customers.
    if (await this.customersService.existsByEmail(employee.getEmail())) {
      throw new ConflictException(`Email "${employee.getEmail()}" is already registered as a customer`);
    }

    // 5. Password: longitud 8-64, y nunca igual al email (mismo criterio en reset).
    const password = Password.create(input.password);
    this.assertPasswordIsNotEmail(password, employee);
    const passwordHash = await this.passwordHasher.hash(password.getValue());

    // 6. Crear y persistir
    const account = Account.create({ employeeId: input.employeeId, passwordHash });
    return await this.accountsRepository.save(account);
  }

  // --- US-08: CONSULTAR USUARIO ---
  async findProfileByEmployeeId(employeeId: number): Promise<AccountProfile> {
    const account = await this.accountsRepository.findByEmployeeId(employeeId);
    if (!account) {
      throw new NotFoundException(`Employee with ID ${employeeId} has no account`);
    }
    const employee = await this.employeesService.findById(employeeId);
    return this.toProfile(account, employee);
  }

  async findProfileById(accountId: number): Promise<AccountProfile> {
    const account = await this.findAccountOrFail(accountId);
    const employee = await this.employeesService.findById(account.getEmployeeId());
    return this.toProfile(account, employee);
  }

  // --- US-06: EDITAR USUARIO (cambio de rol) ---
  // El rol vive en Employee (fuente de verdad); esta operación dispara el cambio ahí.
  // La protección del último ADMIN y la sincronización de Account.role ya NO se hacen acá:
  // employeesService.update() emite employee.role-changed (si el rol realmente cambió)
  // dentro de su propia transacción, y el listener de este módulo (ver
  // employee-events.listener.ts) hace ambas cosas. Si el listener rechaza, el error se
  // propaga y deshace el cambio de rol en Employee también.
  async updateRole(accountId: number, newRole: AccountRole): Promise<AccountProfile> {
    const account = await this.findAccountOrFail(accountId);
    if (!account.isActive()) {
      throw new ConflictException(`Account with ID ${accountId} is inactive and cannot be modified`);
    }

    const employee = await this.employeesService.findById(account.getEmployeeId());

    const updatedEmployee = await this.employeesService.update(employee.getId() as number, {
      firstName: employee.getFirstName(),
      lastName: employee.getLastName(),
      phone: employee.getPhone(),
      role: newRole,
    });

    return this.toProfile(account, updatedEmployee);
  }

  // --- US-06: EDITAR USUARIO (resetear contraseña) ---
  async resetPassword(accountId: number, newPassword: string): Promise<Account> {
    const account = await this.findAccountOrFail(accountId);
    if (!account.isActive()) {
      throw new ConflictException(`Account with ID ${accountId} is inactive and cannot be modified`);
    }

    const employee = await this.employeesService.findById(account.getEmployeeId());
    const password = Password.create(newPassword);
    this.assertPasswordIsNotEmail(password, employee);

    const passwordHash = await this.passwordHasher.hash(password.getValue());
    account.changePasswordHash(passwordHash);
    await this.accountsRepository.updatePasswordHash(account);
    return account;
  }

  // --- US-07: DAR DE BAJA USUARIO (disparada directo por HTTP, no por evento) ---
  async deactivate(accountId: number): Promise<void> {
    return await this.transactionRunner.run(async () => {
      const account = await this.findAccountOrFail(accountId);
      if (!account.isActive()) {
        throw new ConflictException(`Account with ID ${accountId} is already inactive`);
      }

      const employee = await this.employeesService.findById(account.getEmployeeId());
      if (employee.getRole() === 'ADMIN') {
        await this.assertNotLastAvailableAdmin(employee);
      }

      account.deactivate();
      await this.accountsRepository.updateStatus(account);

      // auth escucha este evento para revocar las sesiones de la cuenta (Session.revokedAt).
      // accounts ya no revoca sesiones directamente (SessionRevoker se eliminó).
      await this.eventEmitter.emitAsync(ACCOUNT_DEACTIVATED, {
        accountId: account.getId() as number,
      } satisfies AccountDeactivatedEvent);
    });
  }

  // --- SCRUM-27 (reversible): REACTIVAR USUARIO ---
  // Simétrico a deactivate(): nunca crea una Account nueva, nunca toca password/email/role.
  // Solo puede reactivarse una Account cuyo Employee asociado esté activo; si el Employee
  // está inactivo, reactivar la Account lo dejaría con credenciales operativas para un
  // empleado que ya no debería poder loguearse.
  async reactivate(accountId: number): Promise<void> {
    const account = await this.findAccountOrFail(accountId);
    if (account.isActive()) {
      throw new ConflictException(`Account with ID ${accountId} is already active`);
    }

    const employee = await this.employeesService.findById(account.getEmployeeId());
    if (!employee.isActive()) {
      throw new ConflictException(
        `Employee with ID ${employee.getId()} is inactive and cannot have its account reactivated`,
      );
    }

    account.reactivate();
    await this.accountsRepository.updateStatus(account);
  }

  // --- Listener de employee.deactivated (ver employee-events.listener.ts) ---
  // El Employee ya fue persistido como inactivo en la MISMA transacción, antes de que este
  // evento llegue acá (lo publica EmployeesService.deactivate() después de escribir). Por
  // eso no se puede confiar en employeesService.findById(employeeId).isActive() para saber
  // si este empleado "todavía" cuenta como admin disponible: ya no cuenta, por diseño. En
  // vez de releerlo, se lo excluye directamente del conteo de administradores disponibles
  // (ver assertOtherAdminRemainsAvailable) — matemáticamente equivalente y sin el problema
  // de lectura obsoleta.
  async handleEmployeeDeactivated(employeeId: number): Promise<void> {
    return await this.transactionRunner.run(async () => {
      const account = await this.accountsRepository.findByEmployeeId(employeeId);
      if (!account || !account.isActive()) return; // sin cuenta, o ya inactiva: nada que hacer

      // El rol no lo toca la baja del Employee, así que seguir leyéndolo es seguro.
      const employee = await this.employeesService.findById(employeeId);
      await this.assertOtherAdminRemainsAvailable(employeeId, employee.getRole() as AccountRole);

      account.deactivate();
      await this.accountsRepository.updateStatus(account);

      await this.eventEmitter.emitAsync(ACCOUNT_DEACTIVATED, {
        accountId: account.getId() as number,
      } satisfies AccountDeactivatedEvent);
    });
  }

  // --- Listener de employee.role-changed (ver employee-events.listener.ts) ---
  // El payload ya trae previousRole/newRole: no hace falta (ni conviene, por la misma razón
  // de lectura obsoleta de arriba) volver a leer Employee.role desde la base.
  async handleEmployeeRoleChanged(event: EmployeeRoleChangedEvent): Promise<void> {
    return await this.transactionRunner.run(async () => {
      const account = await this.accountsRepository.findByEmployeeId(event.employeeId);
      if (!account) return; // sin cuenta: nada que sincronizar

      await this.assertOtherAdminRemainsAvailable(event.employeeId, event.previousRole as AccountRole);

      await this.accountsRepository.syncRoleFromEmployee(
        account.getId() as number,
        event.newRole as AccountRole,
      );
    });
  }

  // --- Listener de customer.email-changed (ver customer-events.listener.ts) ---
  // El email de acceso de un cliente es una copia de Customer.email: si el cliente lo cambia,
  // hay que cambiarlo también en su cuenta, o seguiría entrando con el email viejo. Si el
  // email nuevo ya lo usa OTRA cuenta (de un empleado o de otro cliente), se rechaza con 409
  // y, como corre en la transacción de quien publicó, se deshace también el cambio en Customer.
  async handleCustomerEmailChanged(event: CustomerEmailChangedEvent): Promise<void> {
    return await this.transactionRunner.run(async () => {
      const email = event.email.trim().toLowerCase();

      const employeeAccount = await this.accountsRepository.findByEmail(email);
      const customerAccount = await this.accountsRepository.findCustomerLoginByEmail(email);
      const usedByAnother =
        employeeAccount !== null ||
        (customerAccount !== null && customerAccount.customerId !== event.customerId);

      if (usedByAnother) {
        throw new ConflictException(`Email "${email}" is already used by another account`);
      }

      await this.accountsRepository.updateEmailByCustomerId(event.customerId, email);
    });
  }

  // --- Login (consumido por auth; sin endpoint HTTP propio) ---
  // Decisión definitiva: TODOS los usuarios (empleados y clientes) se autentican con
  // email + password. El DNI queda solo para búsquedas operativas de clientes en caja,
  // nunca como credencial. Primero se busca una cuenta de empleado (AccountRepository.
  // findByEmail); si no hay, una de cliente (findCustomerLoginByEmail).
  async verifyCredentials(email: string, password: string): Promise<AuthAccountInfo | undefined> {
    const normalizedEmail = email.trim().toLowerCase();
    const account = await this.accountsRepository.findByEmail(normalizedEmail);

    // No es una cuenta de empleado: puede ser de un cliente (o no existir)
    if (!account) {
      return await this.verifyCustomerCredentials(normalizedEmail, password);
    }

    if (!account.isActive()) {
      // Mitigación de timing: igual se ejecuta una verificación de hash (y se descarta el
      // resultado), para que responder "no existe"/"no está activa" tarde parecido a una
      // verificación real y no permita enumerar emails registrados midiendo el tiempo de
      // respuesta. Ver getDummyPasswordHash() más abajo.
      await this.passwordHasher.verify(password, await this.getDummyPasswordHash());
      return undefined;
    }

    const matches = await this.passwordHasher.verify(password, account.getPasswordHash());
    if (!matches) return undefined;

    const employee = await this.employeesService.findById(account.getEmployeeId());
    return {
      accountId: account.getId() as number,
      role: employee.getRole() as AccountRole,
      owner: { employeeId: employee.getId() as number },
      email: account.getEmail() as string,
      firstName: employee.getFirstName(),
      lastName: employee.getLastName(),
    };
  }

  // Login de un cliente. Misma mitigación de timing que el de empleados: si no hay cuenta (o
  // está inactiva) igual se ejecuta una verificación de hash contra el señuelo.
  private async verifyCustomerCredentials(
    email: string,
    password: string,
  ): Promise<AuthAccountInfo | undefined> {
    const record = await this.accountsRepository.findCustomerLoginByEmail(email);

    if (!record || !record.active) {
      await this.passwordHasher.verify(password, await this.getDummyPasswordHash());
      return undefined;
    }

    const matches = await this.passwordHasher.verify(password, record.passwordHash);
    if (!matches) return undefined;

    return await this.toCustomerAuthInfo(record);
  }

  // El estado del cliente (activo o dado de baja) se lee de Customer en cada login y en cada
  // renovación; no se copia en la cuenta. Por eso dar de baja a un cliente corta su acceso al
  // instante, y reactivarlo lo devuelve sin sincronizar nada: es la misma idea que "el rol
  // de un empleado sale de Employee".
  private async toCustomerAuthInfo(record: {
    accountId: number;
    customerId: number;
    email: string;
  }): Promise<AuthAccountInfo | undefined> {
    const customer = await this.customersService.findById(record.customerId);
    if (!customer.isActive()) return undefined;

    return {
      accountId: record.accountId,
      role: 'CUSTOMER',
      owner: { customerId: record.customerId },
      email: record.email,
      firstName: customer.getFirstName(),
      lastName: customer.getLastName(),
    };
  }

  // Hash "señuelo" para el caso "email inexistente" de verifyCredentials. NO es una
  // constante fija configurada externamente: se genera hasheando un texto aleatorio
  // interno (nunca una contraseña real ni derivada de ningún dato de negocio) la primera
  // vez que hace falta, y se memoiza para el resto de la vida de esta instancia — así el
  // costo de hashear no se repite en cada intento de login con un email que no existe.
  // Lazy (no en el constructor) a propósito: todavía no hay un provider concreto de
  // PasswordHasher registrado en AccountsModule (pendiente de auth); si esto se calculara
  // de forma eager al construir el servicio, instanciar AccountsService sin esa
  // implementación fallaría incluso en flujos que nunca llegan a necesitar el señuelo.
  private dummyPasswordHashPromise: Promise<string> | null = null;

  private getDummyPasswordHash(): Promise<string> {
    if (!this.dummyPasswordHashPromise) {
      const randomInternalText = randomBytes(32).toString('hex');
      this.dummyPasswordHashPromise = this.passwordHasher.hash(randomInternalText);
    }
    return this.dummyPasswordHashPromise;
  }

  // Para refresh (auth trabaja con accountId, no con el identifier de login). Misma forma
  // de resultado que verifyCredentials: nunca passwordHash. No reemplaza el login inicial.
  async findActiveById(accountId: number): Promise<AuthAccountInfo | undefined> {
    const account = await this.accountsRepository.findById(accountId);

    // No es una cuenta de empleado: puede ser de un cliente (o no existir)
    if (!account) {
      const record = await this.accountsRepository.findCustomerLoginById(accountId);
      if (!record || !record.active) return undefined;
      return await this.toCustomerAuthInfo(record);
    }

    if (!account.isActive()) return undefined;

    const employee = await this.employeesService.findById(account.getEmployeeId());
    return {
      accountId: account.getId() as number,
      role: employee.getRole() as AccountRole,
      owner: { employeeId: employee.getId() as number },
      email: account.getEmail() as string,
      firstName: employee.getFirstName(),
      lastName: employee.getLastName(),
    };
  }

  // --- Protección del último ADMIN disponible (llamadas directas: US-06/US-07 por HTTP) ---
  // "Disponible" = Employee.active && Employee.role === 'ADMIN' && Account.active.
  private async assertNotLastAvailableAdmin(employee: Employee): Promise<void> {
    const isCurrentlyAvailableAdmin = employee.isActive() && employee.getRole() === 'ADMIN';
    if (!isCurrentlyAvailableAdmin) return;

    const availableAdmins = await this.countAvailableAdmins();
    if (availableAdmins <= 1) {
      throw new ConflictException(
        'This operation would leave the system without an available administrator',
      );
    }
  }

  // --- Misma protección, para los listeners de eventos (ver comentario en cada handler) ---
  // Excluye employeeId del conteo en vez de releer su estado, porque ese Employee ya fue
  // mutado en la misma transacción antes de que el evento llegue acá.
  private async assertOtherAdminRemainsAvailable(
    employeeId: number,
    roleBeingRemoved: AccountRole,
  ): Promise<void> {
    if (roleBeingRemoved !== 'ADMIN') return;

    const activeEmployees = await this.employeesService.findAll({ active: true });
    const otherAdminIds = activeEmployees
      .filter((employee) => employee.getRole() === 'ADMIN' && employee.getId() !== employeeId)
      .map((employee) => employee.getId() as number);

    const availableAdmins =
      otherAdminIds.length === 0
        ? 0
        : await this.accountsRepository.countActiveByEmployeeIds(otherAdminIds);

    if (availableAdmins === 0) {
      throw new ConflictException(
        'This operation would leave the system without an available administrator',
      );
    }
  }

  private async countAvailableAdmins(): Promise<number> {
    const activeEmployees = await this.employeesService.findAll({ active: true });
    const adminIds = activeEmployees
      .filter((employee) => employee.getRole() === 'ADMIN')
      .map((employee) => employee.getId() as number);

    if (adminIds.length === 0) return 0;
    return await this.accountsRepository.countActiveByEmployeeIds(adminIds);
  }

  // El email se normaliza (trim + lowercase, ya aplicado por el VO Mail de Employee); la
  // password es opaca y se compara tal cual — sin trim, sin lowercase, sin ninguna
  // transformación. Por diseño: "Password123" y "password123" (o el email con espacios)
  // NO se consideran la misma password a los efectos de esta regla, aunque coincidan tras
  // alguna normalización. Solo se rechaza la igualdad literal, byte a byte.
  private assertPasswordIsNotEmail(password: Password, employee: Employee): void {
    if (password.getValue() === employee.getEmail()) {
      throw new BadRequestException('Password cannot be the same as the email');
    }
  }

  private async findAccountOrFail(accountId: number): Promise<Account> {
    const account = await this.accountsRepository.findById(accountId);
    if (!account) {
      throw new NotFoundException(`Account with ID ${accountId} not found`);
    }
    return account;
  }

  private toProfile(account: Account, employee: Employee): AccountProfile {
    return {
      accountId: account.getId() as number,
      employeeId: employee.getId() as number,
      email: employee.getEmail(),
      role: employee.getRole() as AccountRole,
      active: account.isActive(),
    };
  }
}
