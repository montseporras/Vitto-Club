import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AccountsService, type AccountOwner } from './accounts.service.js';
import { Account } from '../domain/account.js';
import { AccountRepository } from '../domain/port/account.repository.js';
import { PasswordHasher } from '../domain/port/password-hasher.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import { DomainError } from '../domain/errors/domain.error.js';
import { ACCOUNT_DEACTIVATED } from '../../shared/events/domain-events.js';
import { EmployeesService } from '../../employees/application/employees.service.js';
import { Employee, EmployeeData } from '../../employees/domain/employee.js';
import { EmployeeListFilters, EmployeeRepository } from '../../employees/domain/port/employee.repository.js';
import { TransactionRunner as EmployeeTransactionRunner } from '../../employees/domain/port/transaction-runner.js';
import { CustomersService } from '../../customers/application/customers.service.js';
import { Customer } from '../../customers/domain/customer.js';
import { CustomerListResult, CustomerRepository } from '../../customers/domain/port/customer.repository.js';
import { CustomerStatusChange } from '../../customers/domain/customer-status-change.js';

// --- Fakes en memoria, uno por puerto. Mismo criterio que employees.service.spec.ts. ---

class FakeEmployeeRepository implements EmployeeRepository {
  readonly items = new Map<number, Employee>();
  private nextId = 1;

  async save(employee: Employee): Promise<Employee> {
    const id = this.nextId++;
    const saved = Employee.reconstruct({
      id,
      firstName: employee.getFirstName(),
      lastName: employee.getLastName(),
      email: employee.getEmail(),
      role: employee.getRole(),
      phone: employee.getPhone(),
      active: employee.isActive(),
      deactivatedAt: employee.getDeactivatedAt(),
      createdAt: employee.getCreatedAt(),
      updatedAt: employee.getUpdatedAt(),
    });
    this.items.set(id, saved);
    return saved;
  }
  async findById(id: number): Promise<Employee | null> {
    return this.items.get(id) ?? null;
  }
  async findAll(filters: EmployeeListFilters = {}): Promise<Employee[]> {
    return [...this.items.values()].filter(
      (e) => filters.active === undefined || e.isActive() === filters.active,
    );
  }
  async update(employee: Employee): Promise<void> {
    this.items.set(employee.getId() as number, employee);
  }
  async updateStatus(employee: Employee): Promise<void> {
    this.items.set(employee.getId() as number, employee);
  }
  async existsByEmail(email: string): Promise<boolean> {
    return [...this.items.values()].some((e) => e.getEmail() === email.toLowerCase());
  }

  // Helper de test: carga un empleado ya "persistido" con un id conocido
  seed(data: EmployeeData & { id: number; active?: boolean }): Employee {
    const employee = Employee.reconstruct({
      id: data.id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      role: data.role,
      phone: data.phone,
      active: data.active ?? true,
    });
    this.items.set(data.id, employee);
    if (data.id >= this.nextId) this.nextId = data.id + 1;
    return employee;
  }
}

class FakeCustomerRepository implements CustomerRepository {
  readonly emails = new Set<string>();

  async existsByEmail(email: string): Promise<boolean> {
    return this.emails.has(email.toLowerCase());
  }
  // No usados por estos tests: AccountsService solo llama a CustomersService.existsByEmail
  async findAll(): Promise<Customer[]> { throw new Error('not implemented'); }
  async findById(): Promise<Customer | null> { throw new Error('not implemented'); }
  async findByDocument(): Promise<Customer | null> { throw new Error('not implemented'); }
  async save(): Promise<Customer> { throw new Error('not implemented'); }
  async update(): Promise<void> { throw new Error('not implemented'); }
  async updateStatus(): Promise<void> { throw new Error('not implemented'); }
  async findStatusHistory(): Promise<CustomerStatusChange[]> { throw new Error('not implemented'); }
  async existsByDocument(): Promise<boolean> { throw new Error('not implemented'); }
  async list(): Promise<CustomerListResult> { throw new Error('not implemented'); }
}

class FakeAccountRepository implements AccountRepository {
  readonly items = new Map<number, Account>();
  // Registro de llamadas a syncRoleFromEmployee, para verificar que el listener de
  // employee.role-changed sincroniza Account.role (derivado).
  readonly syncedRoles: { accountId: number; role: string }[] = [];
  private nextId = 1;

  // Mismo criterio que AccountPrismaRepository.save(): el email no viene en AccountData,
  // se copia de Employee.email en el momento de persistir.
  constructor(private readonly employeeRepo: FakeEmployeeRepository) {}

  async save(account: Account): Promise<Account> {
    const id = this.nextId++;
    const employee = await this.employeeRepo.findById(account.getEmployeeId());
    const saved = Account.reconstruct({
      id,
      employeeId: account.getEmployeeId(),
      email: employee?.getEmail() as string,
      passwordHash: account.getPasswordHash(),
      active: account.isActive(),
      deactivatedAt: account.getDeactivatedAt(),
      createdAt: account.getCreatedAt(),
      updatedAt: account.getUpdatedAt(),
    });
    this.items.set(id, saved);
    return saved;
  }
  async findById(id: number): Promise<Account | null> {
    return this.items.get(id) ?? null;
  }
  async findByEmployeeId(employeeId: number): Promise<Account | null> {
    return [...this.items.values()].find((a) => a.getEmployeeId() === employeeId) ?? null;
  }
  async findByEmail(_email: string): Promise<Account | null> {
    throw new Error('not implemented: se reasigna por test en el describe de verifyCredentials');
  }
  async existsByEmployeeId(employeeId: number): Promise<boolean> {
    return [...this.items.values()].some((a) => a.getEmployeeId() === employeeId);
  }
  async updatePasswordHash(account: Account): Promise<void> {
    this.items.set(account.getId() as number, account);
  }
  async updateStatus(account: Account): Promise<void> {
    this.items.set(account.getId() as number, account);
  }
  async syncRoleFromEmployee(accountId: number, role: string): Promise<void> {
    this.syncedRoles.push({ accountId, role });
  }
  async countActiveByEmployeeIds(employeeIds: number[]): Promise<number> {
    return [...this.items.values()].filter(
      (a) => a.isActive() && employeeIds.includes(a.getEmployeeId()),
    ).length;
  }
}

class FakePasswordHasher implements PasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    return `hashed:${plainPassword}`;
  }
  async verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    return passwordHash === `hashed:${plainPassword}`;
  }
}

// Sin transacción real: alcanza con ejecutar fn directamente. El rollback real (cuando el
// listener de employee.deactivated/role-changed tira) se prueba en
// employees.service.spec.ts, que sí necesita una transacción compartida entre los dos
// módulos para verificar que ambas escrituras se deshacen juntas.
class PassthroughTransactionRunner implements TransactionRunner {
  async run<T>(fn: () => Promise<T>): Promise<T> {
    return fn();
  }
}

class FakeEventEmitter {
  readonly emitted: { event: string; payload: unknown }[] = [];
  async emitAsync(event: string, payload: unknown): Promise<unknown[]> {
    this.emitted.push({ event, payload });
    return [];
  }
}

describe('AccountsService', () => {
  let employeeRepo: FakeEmployeeRepository;
  let customerRepo: FakeCustomerRepository;
  let accountRepo: FakeAccountRepository;
  let passwordHasher: FakePasswordHasher;
  let eventEmitter: FakeEventEmitter;
  let employeesService: EmployeesService;
  let customersService: CustomersService;
  let service: AccountsService;

  beforeEach(() => {
    employeeRepo = new FakeEmployeeRepository();
    customerRepo = new FakeCustomerRepository();
    accountRepo = new FakeAccountRepository(employeeRepo);
    passwordHasher = new FakePasswordHasher();
    eventEmitter = new FakeEventEmitter();
    // EmployeesService ya no depende de customers ni de accounts (ver employees.service.ts:
    // dirección única Customers -> Employees), así que se construye sin ningún stub
    // circular. CustomersService sigue necesitando el EmployeesService real para su propio
    // chequeo (Customers -> Employees); ninguno de los tests de AccountsService ejercita
    // customersService.create()/update() (acá se usa employeeRepo.seed()/customerRepo.emails
    // directamente), así que no importa que ese chequeo nunca encuentre nada.
    employeesService = new EmployeesService(
      employeeRepo,
      new PassthroughEmployeeTransactionRunner(),
      eventEmitter as unknown as import('@nestjs/event-emitter').EventEmitter2,
    );
    customersService = new CustomersService(customerRepo, employeesService);
    service = new AccountsService(
      accountRepo,
      employeesService,
      customersService,
      passwordHasher,
      new PassthroughTransactionRunner(),
      eventEmitter as unknown as import('@nestjs/event-emitter').EventEmitter2,
    );
  });

  const ADMIN_EMPLOYEE = {
    id: 1,
    firstName: 'Ana',
    lastName: 'Gómez',
    email: 'ana.gomez@vitto.club',
    role: 'ADMIN' as const,
    phone: null,
  };
  const CASHIER_EMPLOYEE = {
    id: 2,
    firstName: 'Bruno',
    lastName: 'Pérez',
    email: 'bruno.perez@vitto.club',
    role: 'CASHIER' as const,
    phone: null,
  };

  describe('register (US-05)', () => {
    it('crea la cuenta cuando el empleado existe, está activo y no tiene cuenta', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);

      const account = await service.register({
        employeeId: 2,
        email: 'bruno.perez@vitto.club',
        password: 'secreta123',
      });

      expect(account.getEmployeeId()).toBe(2);
      expect(account.getPasswordHash()).toBe('hashed:secreta123');
      expect(account.isActive()).toBe(true);
    });

    it('acepta password de exactamente 8 caracteres (mínimo)', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);

      const account = await service.register({
        employeeId: 2,
        email: 'bruno.perez@vitto.club',
        password: 'x'.repeat(8),
      });

      expect(account.getPasswordHash()).toBe(`hashed:${'x'.repeat(8)}`);
    });

    it('acepta password de exactamente 64 caracteres (máximo)', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);

      const account = await service.register({
        employeeId: 2,
        email: 'bruno.perez@vitto.club',
        password: 'x'.repeat(64),
      });

      expect(account.getPasswordHash()).toBe(`hashed:${'x'.repeat(64)}`);
    });

    it('rechaza si el empleado no existe', async () => {
      await expect(
        service.register({ employeeId: 999, email: 'x@x.com', password: 'secreta123' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza si el empleado está inactivo', async () => {
      employeeRepo.seed({ ...CASHIER_EMPLOYEE, active: false });

      await expect(
        service.register({
          employeeId: 2,
          email: 'bruno.perez@vitto.club',
          password: 'secreta123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rechaza si el empleado ya tiene una cuenta', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      await service.register({ employeeId: 2, email: 'bruno.perez@vitto.club', password: 'secreta123' });

      await expect(
        service.register({ employeeId: 2, email: 'bruno.perez@vitto.club', password: 'otraClave' }),
      ).rejects.toThrow(ConflictException);
    });

    it('rechaza si el email no corresponde al del empleado', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);

      await expect(
        service.register({ employeeId: 2, email: 'otro@mail.com', password: 'secreta123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza si el email ya está en uso por un customer', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      customerRepo.emails.add('bruno.perez@vitto.club');

      await expect(
        service.register({ employeeId: 2, email: 'bruno.perez@vitto.club', password: 'secreta123' }),
      ).rejects.toThrow(ConflictException);
    });

    // Escenario C (unicidad global de email): el email de la cuenta es el del propio
    // empleado asociado -> no debe rechazarse por "encontrarse a sí mismo".
    it('no rechaza por encontrar el email del propio empleado asociado', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);

      const account = await service.register({
        employeeId: 2,
        email: 'bruno.perez@vitto.club',
        password: 'secreta123',
      });

      expect(account.getEmployeeId()).toBe(2);
    });

    it('rechaza password de más de 64 caracteres', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);

      await expect(
        service.register({
          employeeId: 2,
          email: 'bruno.perez@vitto.club',
          password: 'x'.repeat(65),
        }),
      ).rejects.toThrow(DomainError);
    });

    it('rechaza password de menos de 8 caracteres', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);

      await expect(
        service.register({
          employeeId: 2,
          email: 'bruno.perez@vitto.club',
          password: 'x'.repeat(7),
        }),
      ).rejects.toThrow(DomainError);
    });

    it('rechaza password igual al email', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);

      await expect(
        service.register({
          employeeId: 2,
          email: 'bruno.perez@vitto.club',
          password: 'bruno.perez@vitto.club',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    // Decisión vigente (punto 8): la password es opaca — NO se le aplica trim() ni
    // lowercase() para esta comparación. Solo el email se normaliza (ya lo hace el VO Mail
    // de Employee). Por eso una password que coincide con el email salvo por mayúsculas o
    // espacios NO se considera "la misma" a los efectos de esta regla: solo se rechaza la
    // igualdad literal, byte a byte.
    it('NO rechaza una password que solo coincide con el email tras cambiar mayúsculas (comparación byte a byte)', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);

      const account = await service.register({
        employeeId: 2,
        email: 'bruno.perez@vitto.club',
        password: 'BRUNO.PEREZ@VITTO.CLUB',
      });

      expect(account.getEmployeeId()).toBe(2);
    });

    it('NO rechaza una password que solo coincide con el email después de recortar espacios (comparación byte a byte)', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);

      const account = await service.register({
        employeeId: 2,
        email: 'bruno.perez@vitto.club',
        password: ' bruno.perez@vitto.club ',
      });

      expect(account.getEmployeeId()).toBe(2);
    });

    it('acepta una password distinta del email sin restricciones adicionales', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);

      const account = await service.register({
        employeeId: 2,
        email: 'bruno.perez@vitto.club',
        password: 'secreta123',
      });

      expect(account.getPasswordHash()).toBe('hashed:secreta123');
    });
  });

  describe('findProfileByEmployeeId / findProfileById (US-08)', () => {
    it('devuelve email, rol y estado, nunca el passwordHash', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({
        employeeId: 2,
        email: 'bruno.perez@vitto.club',
        password: 'secreta123',
      });

      const profile = await service.findProfileById(account.getId() as number);

      expect(profile).toEqual({
        accountId: account.getId(),
        employeeId: 2,
        email: 'bruno.perez@vitto.club',
        role: 'CASHIER',
        active: true,
      });
      expect(profile).not.toHaveProperty('passwordHash');
    });

    it('404 si el empleado no tiene cuenta', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      await expect(service.findProfileByEmployeeId(2)).rejects.toThrow(NotFoundException);
    });
  });

  describe('resetPassword (US-06)', () => {
    it('reemplaza el passwordHash delegando en PasswordHasher', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({
        employeeId: 2,
        email: 'bruno.perez@vitto.club',
        password: 'vieja123',
      });

      const updated = await service.resetPassword(account.getId() as number, 'nueva456');

      expect(updated.getPasswordHash()).toBe('hashed:nueva456');
    });

    it('rechaza si la cuenta está inactiva', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({
        employeeId: 2,
        email: 'bruno.perez@vitto.club',
        password: 'vieja123',
      });
      await service.deactivate(account.getId() as number);

      await expect(
        service.resetPassword(account.getId() as number, 'nueva456'),
      ).rejects.toThrow(ConflictException);
    });

    it('404 si la cuenta no existe', async () => {
      await expect(service.resetPassword(999, 'nueva456')).rejects.toThrow(NotFoundException);
    });

    it('rechaza una password nueva de menos de 8 caracteres', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({
        employeeId: 2,
        email: 'bruno.perez@vitto.club',
        password: 'vieja123',
      });

      await expect(
        service.resetPassword(account.getId() as number, 'x'.repeat(7)),
      ).rejects.toThrow(DomainError);
      // La password vieja sigue siendo válida: el reset inválido no la tocó
      expect(accountRepo.items.get(account.getId() as number)?.getPasswordHash()).toBe(
        'hashed:vieja123',
      );
    });

    it('rechaza una password nueva de más de 64 caracteres', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({
        employeeId: 2,
        email: 'bruno.perez@vitto.club',
        password: 'vieja123',
      });

      await expect(
        service.resetPassword(account.getId() as number, 'x'.repeat(65)),
      ).rejects.toThrow(DomainError);
    });

    it('rechaza una password nueva igual al email del empleado', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({
        employeeId: 2,
        email: 'bruno.perez@vitto.club',
        password: 'vieja123',
      });

      await expect(
        service.resetPassword(account.getId() as number, 'bruno.perez@vitto.club'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateRole (US-06)', () => {
    it('delega el cambio en employeesService.update(); ya no sincroniza Account.role directamente', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({
        employeeId: 2,
        email: 'bruno.perez@vitto.club',
        password: 'secreta123',
      });

      const profile = await service.updateRole(account.getId() as number, 'ADMIN');

      expect(profile.role).toBe('ADMIN');
      expect(employeeRepo.items.get(2)?.getRole()).toBe('ADMIN');
      // La sincronización de Account.role ahora la hace el listener de
      // employee.role-changed (ver employees.service.spec.ts), no updateRole() directo.
      expect(accountRepo.syncedRoles).toHaveLength(0);
    });

    it('404 si la cuenta no existe', async () => {
      await expect(service.updateRole(999, 'ADMIN')).rejects.toThrow(NotFoundException);
    });

    it('rechaza si la cuenta está inactiva', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({
        employeeId: 2,
        email: 'bruno.perez@vitto.club',
        password: 'secreta123',
      });
      await service.deactivate(account.getId() as number);

      await expect(service.updateRole(account.getId() as number, 'ADMIN')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('deactivate (US-07, llamada directa por HTTP)', () => {
    it('da de baja una cuenta de un CASHIER sin restricciones y publica account.deactivated', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({
        employeeId: 2,
        email: 'bruno.perez@vitto.club',
        password: 'secreta123',
      });

      await service.deactivate(account.getId() as number);

      const stored = accountRepo.items.get(account.getId() as number);
      expect(stored?.isActive()).toBe(false);
      expect(eventEmitter.emitted).toEqual([
        { event: ACCOUNT_DEACTIVATED, payload: { accountId: account.getId() } },
      ]);
    });

    it('bloquea dar de baja al último ADMIN disponible y no publica el evento', async () => {
      employeeRepo.seed(ADMIN_EMPLOYEE);
      const account = await service.register({
        employeeId: 1,
        email: 'ana.gomez@vitto.club',
        password: 'secreta123',
      });

      await expect(service.deactivate(account.getId() as number)).rejects.toThrow(ConflictException);
      expect(accountRepo.items.get(account.getId() as number)?.isActive()).toBe(true);
      expect(eventEmitter.emitted).toHaveLength(0);
    });

    it('permite dar de baja a un ADMIN si hay otro ADMIN disponible', async () => {
      employeeRepo.seed(ADMIN_EMPLOYEE);
      employeeRepo.seed({ id: 3, firstName: 'Carla', lastName: 'Martínez', email: 'carla@vitto.club', role: 'ADMIN', phone: null });
      const account1 = await service.register({ employeeId: 1, email: 'ana.gomez@vitto.club', password: 'secreta123' });
      await service.register({ employeeId: 3, email: 'carla@vitto.club', password: 'secreta123' });

      await service.deactivate(account1.getId() as number);

      expect(accountRepo.items.get(account1.getId() as number)?.isActive()).toBe(false);
    });

    it('rechaza si ya está inactiva', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({ employeeId: 2, email: 'bruno.perez@vitto.club', password: 'secreta123' });
      await service.deactivate(account.getId() as number);

      await expect(service.deactivate(account.getId() as number)).rejects.toThrow(ConflictException);
    });

    it('404 si la cuenta no existe', async () => {
      await expect(service.deactivate(999)).rejects.toThrow(NotFoundException);
    });

    it('404 si la cuenta existe pero el empleado asociado no (dato inconsistente)', async () => {
      const orphanAccount = Account.reconstruct({
        id: 500,
        employeeId: 12345,
        email: 'orphan@vitto.club',
        passwordHash: 'hashed:x',
        active: true,
      });
      accountRepo.items.set(500, orphanAccount);

      await expect(service.deactivate(500)).rejects.toThrow(NotFoundException);
    });
  });

  describe('reactivate (SCRUM-27, reversible)', () => {
    it('reactiva una cuenta inactiva cuyo Employee está activo', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({ employeeId: 2, email: 'bruno.perez@vitto.club', password: 'secreta123' });
      await service.deactivate(account.getId() as number);

      await service.reactivate(account.getId() as number);

      expect(accountRepo.items.get(account.getId() as number)?.isActive()).toBe(true);
    });

    it('bloquea la reactivación si el Employee asociado está inactivo', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({ employeeId: 2, email: 'bruno.perez@vitto.club', password: 'secreta123' });
      await service.deactivate(account.getId() as number);
      await employeesService.deactivate(2);

      await expect(service.reactivate(account.getId() as number)).rejects.toThrow(ConflictException);
      expect(accountRepo.items.get(account.getId() as number)?.isActive()).toBe(false);
    });

    it('404 si la cuenta no existe', async () => {
      await expect(service.reactivate(999)).rejects.toThrow(NotFoundException);
    });

    it('rechaza si ya está activa', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({ employeeId: 2, email: 'bruno.perez@vitto.club', password: 'secreta123' });

      await expect(service.reactivate(account.getId() as number)).rejects.toThrow(ConflictException);
    });

    it('no crea una cuenta nueva y mantiene email, role y passwordHash', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({ employeeId: 2, email: 'bruno.perez@vitto.club', password: 'secreta123' });
      const originalPasswordHash = account.getPasswordHash();
      await service.deactivate(account.getId() as number);

      await service.reactivate(account.getId() as number);

      const stored = accountRepo.items.get(account.getId() as number);
      expect(stored?.getId()).toBe(account.getId());
      expect(stored?.getEmail()).toBe('bruno.perez@vitto.club');
      expect(stored?.getPasswordHash()).toBe(originalPasswordHash);
      const profile = await service.findProfileById(account.getId() as number);
      expect(profile.role).toBe('CASHIER');
      expect(accountRepo.items.size).toBe(1);
    });
  });

  describe('handleEmployeeDeactivated (listener de employee.deactivated)', () => {
    it('da de baja la cuenta del empleado si tiene una activa y publica account.deactivated', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({ employeeId: 2, email: 'bruno.perez@vitto.club', password: 'secreta123' });

      await service.handleEmployeeDeactivated(2);

      expect(accountRepo.items.get(account.getId() as number)?.isActive()).toBe(false);
      expect(eventEmitter.emitted).toContainEqual({
        event: ACCOUNT_DEACTIVATED,
        payload: { accountId: account.getId() },
      });
    });

    it('no hace nada si el empleado no tiene cuenta', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      await expect(service.handleEmployeeDeactivated(2)).resolves.toBeUndefined();
      expect(eventEmitter.emitted).toHaveLength(0);
    });

    it('no hace nada si la cuenta ya estaba inactiva', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({ employeeId: 2, email: 'bruno.perez@vitto.club', password: 'secreta123' });
      await service.deactivate(account.getId() as number);
      eventEmitter.emitted.length = 0;

      await service.handleEmployeeDeactivated(2);

      expect(eventEmitter.emitted).toHaveLength(0);
    });

    it('protege al último ADMIN excluyendo al propio employeeId (no relee su isActive, ya stale)', async () => {
      employeeRepo.seed(ADMIN_EMPLOYEE);
      const account = await service.register({ employeeId: 1, email: 'ana.gomez@vitto.club', password: 'secreta123' });
      // Simula el estado que ve el listener: el Employee YA está marcado inactivo en la
      // misma transacción (lo hizo EmployeesService.deactivate() antes de publicar), pero
      // su rol sigue siendo ADMIN. Sin la exclusión, isCurrentlyAvailableAdmin leería
      // false y dejaría pasar la baja sin protección — este test prueba que eso NO pasa.
      employeeRepo.items.set(1, Employee.reconstruct({ ...ADMIN_EMPLOYEE, active: false }));

      await expect(service.handleEmployeeDeactivated(1)).rejects.toThrow(ConflictException);
      expect(accountRepo.items.get(account.getId() as number)?.isActive()).toBe(true);
      expect(eventEmitter.emitted).toHaveLength(0);
    });

    it('permite la baja si hay otro ADMIN disponible', async () => {
      employeeRepo.seed(ADMIN_EMPLOYEE);
      employeeRepo.seed({ id: 3, firstName: 'Carla', lastName: 'Martínez', email: 'carla@vitto.club', role: 'ADMIN', phone: null });
      const account1 = await service.register({ employeeId: 1, email: 'ana.gomez@vitto.club', password: 'secreta123' });
      await service.register({ employeeId: 3, email: 'carla@vitto.club', password: 'secreta123' });
      employeeRepo.items.set(1, Employee.reconstruct({ ...ADMIN_EMPLOYEE, active: false }));

      await service.handleEmployeeDeactivated(1);

      expect(accountRepo.items.get(account1.getId() as number)?.isActive()).toBe(false);
    });
  });

  describe('handleEmployeeRoleChanged (listener de employee.role-changed)', () => {
    it('sincroniza Account.role con el nuevo rol', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({ employeeId: 2, email: 'bruno.perez@vitto.club', password: 'secreta123' });

      await service.handleEmployeeRoleChanged({ employeeId: 2, previousRole: 'CASHIER', newRole: 'ADMIN' });

      expect(accountRepo.syncedRoles).toEqual([{ accountId: account.getId(), role: 'ADMIN' }]);
    });

    it('sin Account asociada, no hace nada (no lanza)', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);

      await expect(
        service.handleEmployeeRoleChanged({ employeeId: 2, previousRole: 'CASHIER', newRole: 'ADMIN' }),
      ).resolves.toBeUndefined();
      expect(accountRepo.syncedRoles).toHaveLength(0);
    });

    it('bloquea degradar al último ADMIN disponible, excluyendo al propio employeeId', async () => {
      employeeRepo.seed(ADMIN_EMPLOYEE);
      const account = await service.register({ employeeId: 1, email: 'ana.gomez@vitto.club', password: 'secreta123' });

      await expect(
        service.handleEmployeeRoleChanged({ employeeId: 1, previousRole: 'ADMIN', newRole: 'CASHIER' }),
      ).rejects.toThrow(ConflictException);
      expect(accountRepo.syncedRoles).toHaveLength(0);
      // La Account no quedó sincronizada con el rol nuevo
      expect(accountRepo.items.get(account.getId() as number)).toBeDefined();
    });

    it('permite degradar si hay otro ADMIN disponible', async () => {
      employeeRepo.seed(ADMIN_EMPLOYEE);
      employeeRepo.seed({ id: 3, firstName: 'Carla', lastName: 'Martínez', email: 'carla@vitto.club', role: 'ADMIN', phone: null });
      const account1 = await service.register({ employeeId: 1, email: 'ana.gomez@vitto.club', password: 'secreta123' });
      await service.register({ employeeId: 3, email: 'carla@vitto.club', password: 'secreta123' });

      await service.handleEmployeeRoleChanged({ employeeId: 1, previousRole: 'ADMIN', newRole: 'CASHIER' });

      expect(accountRepo.syncedRoles).toEqual([{ accountId: account1.getId(), role: 'CASHIER' }]);
    });

    it('un cambio que no involucra ADMIN (CASHIER sin tocar ADMIN) no dispara la protección', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({ employeeId: 2, email: 'bruno.perez@vitto.club', password: 'secreta123' });

      await service.handleEmployeeRoleChanged({ employeeId: 2, previousRole: 'CASHIER', newRole: 'ADMIN' });

      expect(accountRepo.syncedRoles).toEqual([{ accountId: account.getId(), role: 'ADMIN' }]);
    });
  });

  describe('verifyCredentials (consumido por auth; sin endpoint HTTP propio)', () => {
    it('devuelve accountId, role y owner cuando el email y la password son correctos', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({ employeeId: 2, email: 'bruno.perez@vitto.club', password: 'secreta123' });
      accountRepo.findByEmail = async (email: string) =>
        email === 'bruno.perez@vitto.club' ? (accountRepo.items.get(account.getId() as number) ?? null) : null;

      const result = await service.verifyCredentials('bruno.perez@vitto.club', 'secreta123');

      expect(result).toEqual({
        accountId: account.getId(),
        role: 'CASHIER',
        owner: { employeeId: 2 },
        email: 'bruno.perez@vitto.club',
      });
    });

    it('devuelve el email ya normalizado aunque el login llegue con mayúsculas/espacios', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({ employeeId: 2, email: 'bruno.perez@vitto.club', password: 'secreta123' });
      accountRepo.findByEmail = async () => accountRepo.items.get(account.getId() as number) ?? null;

      const result = await service.verifyCredentials('  BRUNO.Perez@Vitto.Club  ', 'secreta123');

      expect(result?.email).toBe('bruno.perez@vitto.club');
    });

    it('nunca devuelve passwordHash', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({ employeeId: 2, email: 'bruno.perez@vitto.club', password: 'secreta123' });
      accountRepo.findByEmail = async () => accountRepo.items.get(account.getId() as number) ?? null;

      const result = await service.verifyCredentials('bruno.perez@vitto.club', 'secreta123');

      expect(result).not.toHaveProperty('passwordHash');
    });

    it('acepta la contraseña correcta aunque tenga mayúsculas/espacios (la password es opaca, no se normaliza)', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({ employeeId: 2, email: 'bruno.perez@vitto.club', password: ' Secreta123 ' });
      accountRepo.findByEmail = async () => accountRepo.items.get(account.getId() as number) ?? null;

      const result = await service.verifyCredentials('bruno.perez@vitto.club', ' Secreta123 ');

      expect(result).not.toBeUndefined();
    });

    it('rechaza la contraseña correcta si llega con una variación de mayúsculas/espacios (comparación byte a byte)', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({ employeeId: 2, email: 'bruno.perez@vitto.club', password: 'Secreta123' });
      accountRepo.findByEmail = async () => accountRepo.items.get(account.getId() as number) ?? null;

      expect(await service.verifyCredentials('bruno.perez@vitto.club', 'secreta123')).toBeUndefined();
      expect(await service.verifyCredentials('bruno.perez@vitto.club', ' Secreta123 ')).toBeUndefined();
    });

    it('normaliza el email: mayúsculas y espacios no impiden encontrar la cuenta', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({ employeeId: 2, email: 'bruno.perez@vitto.club', password: 'secreta123' });
      let receivedEmail: string | undefined;
      accountRepo.findByEmail = async (email: string) => {
        receivedEmail = email;
        return accountRepo.items.get(account.getId() as number) ?? null;
      };

      await service.verifyCredentials('  BRUNO.Perez@Vitto.Club  ', 'secreta123');

      expect(receivedEmail).toBe('bruno.perez@vitto.club');
    });

    it('acepta un email ya normalizado sin alterarlo', async () => {
      let receivedEmail: string | undefined;
      accountRepo.findByEmail = async (email: string) => {
        receivedEmail = email;
        return null;
      };

      await service.verifyCredentials('ya.normalizado@vitto.club', 'cualquiera');

      expect(receivedEmail).toBe('ya.normalizado@vitto.club');
    });

    it('devuelve undefined (ausencia) si el email no existe', async () => {
      accountRepo.findByEmail = async () => null;

      expect(await service.verifyCredentials('nadie@vitto.club', 'cualquiera')).toBeUndefined();
    });

    it('si el email no existe, igual ejecuta PasswordHasher.verify (mitigación de timing) y descarta el resultado', async () => {
      accountRepo.findByEmail = async () => null;
      const verifySpy = jest.spyOn(passwordHasher, 'verify');

      await service.verifyCredentials('nadie@vitto.club', 'cualquiera');

      expect(verifySpy).toHaveBeenCalledWith('cualquiera', expect.any(String));
    });

    it('devuelve undefined si la cuenta está inactiva', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({ employeeId: 2, email: 'bruno.perez@vitto.club', password: 'secreta123' });
      await service.deactivate(account.getId() as number);
      accountRepo.findByEmail = async () => accountRepo.items.get(account.getId() as number) ?? null;

      expect(await service.verifyCredentials('bruno.perez@vitto.club', 'secreta123')).toBeUndefined();
    });

    it('devuelve undefined si la password no coincide, y nunca expone el passwordHash', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({ employeeId: 2, email: 'bruno.perez@vitto.club', password: 'secreta123' });
      accountRepo.findByEmail = async () => accountRepo.items.get(account.getId() as number) ?? null;

      const result = await service.verifyCredentials('bruno.perez@vitto.club', 'incorrecta123');

      expect(result).toBeUndefined();
    });
  });

  describe('findActiveById (consumido por auth para refresh; trabaja con accountId)', () => {
    it('devuelve accountId, role y owner cuando la cuenta existe y está activa', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({ employeeId: 2, email: 'bruno.perez@vitto.club', password: 'secreta123' });

      const result = await service.findActiveById(account.getId() as number);

      expect(result).toEqual({
        accountId: account.getId(),
        role: 'CASHIER',
        owner: { employeeId: 2 },
        email: 'bruno.perez@vitto.club',
      });
    });

    it('devuelve undefined si la cuenta no existe', async () => {
      expect(await service.findActiveById(999)).toBeUndefined();
    });

    it('devuelve undefined si la cuenta está inactiva', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({ employeeId: 2, email: 'bruno.perez@vitto.club', password: 'secreta123' });
      await service.deactivate(account.getId() as number);

      expect(await service.findActiveById(account.getId() as number)).toBeUndefined();
    });

    it('nunca expone passwordHash', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({ employeeId: 2, email: 'bruno.perez@vitto.club', password: 'secreta123' });

      const result = await service.findActiveById(account.getId() as number);

      expect(result).not.toHaveProperty('passwordHash');
    });

    // Prueba de tipo, no de comportamiento: AuthAccountInfo/AccountOwner ya admiten un
    // owner de Customer, aunque este módulo todavía no resuelve cuentas de Customer en
    // tiempo de ejecución (AccountRepository.findByIdentifier/findById siguen limitados a
    // employeeId, ver accounts.repository.ts). Si esto dejara de compilar, significaría
    // que alguien angostó el tipo de vuelta a solo employeeId.
    it('AuthAccountInfo admite un owner de Customer a nivel de tipo', () => {
      // AccountRole hoy solo modela ADMIN/CASHIER (roles de empleado); ampliarlo a
      // 'CUSTOMER' es una decisión aparte, no pedida acá. Esta prueba se limita a
      // confirmar que AccountOwner (la otra mitad de AuthAccountInfo) ya acepta customerId.
      const owner: AccountOwner = { customerId: 9 };
      expect(owner).toEqual({ customerId: 9 });
    });
  });
});

// EmployeesService tiene su propio puerto TransactionRunner (ver
// employees/domain/port/transaction-runner.ts) — se duplica este passthrough acá porque
// esta suite construye EmployeesService directamente, no vía EmployeesModule.
class PassthroughEmployeeTransactionRunner implements EmployeeTransactionRunner {
  async run<T>(fn: () => Promise<T>): Promise<T> {
    return fn();
  }
}
