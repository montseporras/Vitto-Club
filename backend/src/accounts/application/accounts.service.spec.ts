import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AccountsService } from './accounts.service.js';
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

  async save(account: Account): Promise<Account> {
    const id = this.nextId++;
    const saved = Account.reconstruct({
      id,
      employeeId: account.getEmployeeId(),
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
  async findByIdentifier(_identifier: string): Promise<Account | null> {
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
    accountRepo = new FakeAccountRepository();
    passwordHasher = new FakePasswordHasher();
    eventEmitter = new FakeEventEmitter();
    // EmployeesService y CustomersService dependen mutuamente entre sí (unicidad global
    // de email, ver employees.service.ts/customers.service.ts), de la forma estructural
    // { existsByEmail(email) }. Ninguno de los tests de AccountsService ejercita
    // employeesService.create() (acá se usa employeeRepo.seed() directamente), así que el
    // otro extremo de esa dependencia cruzada nunca se invoca: un stub inerte alcanza.
    // EmployeesService ya NO depende de AccountsService (ver employees.service.ts): no
    // hace falta ningún stub circular para construirlo.
    const inertEmailChecker = { existsByEmail: async () => false };
    employeesService = new EmployeesService(
      employeeRepo,
      inertEmailChecker,
      new PassthroughEmployeeTransactionRunner(),
      eventEmitter as unknown as import('@nestjs/event-emitter').EventEmitter2,
    );
    customersService = new CustomersService(customerRepo, inertEmailChecker);
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
        passwordHash: 'hashed:x',
        active: true,
      });
      accountRepo.items.set(500, orphanAccount);

      await expect(service.deactivate(500)).rejects.toThrow(NotFoundException);
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
    it('devuelve accountId, role y owner cuando el identifier y la password son correctos', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({ employeeId: 2, email: 'bruno.perez@vitto.club', password: 'secreta123' });
      accountRepo.findByIdentifier = async (identifier: string) =>
        identifier === 'bruno.perez@vitto.club' ? (accountRepo.items.get(account.getId() as number) ?? null) : null;

      const result = await service.verifyCredentials('bruno.perez@vitto.club', 'secreta123');

      expect(result).toEqual({ accountId: account.getId(), role: 'CASHIER', owner: { employeeId: 2 } });
    });

    it('devuelve null (ausencia) si el identifier no existe', async () => {
      accountRepo.findByIdentifier = async () => null;

      expect(await service.verifyCredentials('nadie@vitto.club', 'cualquiera')).toBeNull();
    });

    it('devuelve null si la cuenta está inactiva', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({ employeeId: 2, email: 'bruno.perez@vitto.club', password: 'secreta123' });
      await service.deactivate(account.getId() as number);
      accountRepo.findByIdentifier = async () => accountRepo.items.get(account.getId() as number) ?? null;

      expect(await service.verifyCredentials('bruno.perez@vitto.club', 'secreta123')).toBeNull();
    });

    it('devuelve null si la password no coincide, y nunca expone el passwordHash', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({ employeeId: 2, email: 'bruno.perez@vitto.club', password: 'secreta123' });
      accountRepo.findByIdentifier = async () => accountRepo.items.get(account.getId() as number) ?? null;

      const result = await service.verifyCredentials('bruno.perez@vitto.club', 'incorrecta123');

      expect(result).toBeNull();
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
