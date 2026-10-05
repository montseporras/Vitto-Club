import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AccountsService } from './accounts.service.js';
import { Account } from '../domain/account.js';
import { AccountRepository } from '../domain/port/account.repository.js';
import { PasswordHasher } from '../domain/port/password-hasher.js';
import { SessionRevoker } from '../domain/port/session-revoker.js';
import { DomainError } from '../domain/errors/domain.error.js';
import { EmployeesService } from '../../employees/application/employees.service.js';
import { Employee, EmployeeData } from '../../employees/domain/employee.js';
import { EmployeeListFilters, EmployeeRepository } from '../../employees/domain/port/employee.repository.js';
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
  // Registro de llamadas a syncRoleFromEmployee, para verificar que AccountsService
  // sincroniza Account.role (derivado) cada vez que cambia Employee.role vía US-06.
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
}

class FakeSessionRevoker implements SessionRevoker {
  readonly revokedAccountIds: number[] = [];
  async revokeAllForAccount(accountId: number): Promise<void> {
    this.revokedAccountIds.push(accountId);
  }
}

describe('AccountsService', () => {
  let employeeRepo: FakeEmployeeRepository;
  let customerRepo: FakeCustomerRepository;
  let accountRepo: FakeAccountRepository;
  let passwordHasher: FakePasswordHasher;
  let sessionRevoker: FakeSessionRevoker;
  let employeesService: EmployeesService;
  let customersService: CustomersService;
  let service: AccountsService;

  beforeEach(() => {
    employeeRepo = new FakeEmployeeRepository();
    customerRepo = new FakeCustomerRepository();
    accountRepo = new FakeAccountRepository();
    passwordHasher = new FakePasswordHasher();
    sessionRevoker = new FakeSessionRevoker();
    // EmployeesService y CustomersService dependen mutuamente entre sí (unicidad global
    // de email, ver employees.service.ts/customers.service.ts), de la forma estructural
    // { existsByEmail(email) }. Ninguno de los tests de AccountsService ejercita
    // employeesService.create() ni customersService.create() (acá se usa
    // employeeRepo.seed() y customerRepo.emails directamente), así que el otro extremo de
    // esa dependencia cruzada nunca se invoca: un stub inerte alcanza.
    const inertEmailChecker = { existsByEmail: async () => false };
    // El 3er parámetro de EmployeesService (accountsService) tampoco se ejercita en esta
    // suite: ninguno de estos tests llama a employeesService.deactivate().
    const inertAccountsDeactivator = { deactivateByEmployeeId: async () => {} };
    employeesService = new EmployeesService(employeeRepo, inertEmailChecker, inertAccountsDeactivator);
    customersService = new CustomersService(customerRepo, inertEmailChecker);
    service = new AccountsService(
      accountRepo,
      employeesService,
      customersService,
      passwordHasher,
      sessionRevoker,
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
    // empleado asociado -> no debe rechazarse por "encontrarse a sí mismo". El chequeo
    // cruzado de register() solo consulta customers, nunca employees, así que el propio
    // registro del empleado nunca puede colisionar con esta validación.
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
  });

  describe('updateRole (US-06)', () => {
    it('cambia el rol del empleado asociado cuando no es el último ADMIN disponible', async () => {
      employeeRepo.seed(ADMIN_EMPLOYEE);
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const admin1Account = await service.register({
        employeeId: 1,
        email: 'ana.gomez@vitto.club',
        password: 'secreta123',
      });
      // Segundo ADMIN disponible para que degradar al primero sea posible
      employeeRepo.seed({ id: 3, firstName: 'Carla', lastName: 'Martínez', email: 'carla@vitto.club', role: 'ADMIN', phone: null });
      await service.register({ employeeId: 3, email: 'carla@vitto.club', password: 'secreta123' });

      const profile = await service.updateRole(admin1Account.getId() as number, 'CASHIER');

      expect(profile.role).toBe('CASHIER');
      expect(employeeRepo.items.get(1)?.getRole()).toBe('CASHIER');
    });

    it('sincroniza Account.role (derivado) después de cambiar el rol del empleado', async () => {
      employeeRepo.seed(ADMIN_EMPLOYEE);
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const admin1Account = await service.register({
        employeeId: 1,
        email: 'ana.gomez@vitto.club',
        password: 'secreta123',
      });
      employeeRepo.seed({ id: 3, firstName: 'Carla', lastName: 'Martínez', email: 'carla@vitto.club', role: 'ADMIN', phone: null });
      await service.register({ employeeId: 3, email: 'carla@vitto.club', password: 'secreta123' });

      await service.updateRole(admin1Account.getId() as number, 'CASHIER');

      expect(accountRepo.syncedRoles).toEqual([
        { accountId: admin1Account.getId(), role: 'CASHIER' },
      ]);
    });

    it('bloquea degradar al último ADMIN disponible', async () => {
      employeeRepo.seed(ADMIN_EMPLOYEE);
      const onlyAdminAccount = await service.register({
        employeeId: 1,
        email: 'ana.gomez@vitto.club',
        password: 'secreta123',
      });

      await expect(
        service.updateRole(onlyAdminAccount.getId() as number, 'CASHIER'),
      ).rejects.toThrow(ConflictException);
      // No debe haber mutado el rol
      expect(employeeRepo.items.get(1)?.getRole()).toBe('ADMIN');
      // Tampoco debe haber intentado sincronizar Account.role
      expect(accountRepo.syncedRoles).toHaveLength(0);
    });

    it('un ADMIN sin cuenta activa no cuenta como disponible: igual bloquea si es el único con cuenta', async () => {
      // Dos empleados ADMIN, pero solo uno tiene cuenta activa -> ese es el "último disponible"
      employeeRepo.seed(ADMIN_EMPLOYEE);
      employeeRepo.seed({ id: 4, firstName: 'Diego', lastName: 'Ruiz', email: 'diego@vitto.club', role: 'ADMIN', phone: null });
      const account1 = await service.register({
        employeeId: 1,
        email: 'ana.gomez@vitto.club',
        password: 'secreta123',
      });
      // Diego (id 4) es ADMIN pero nunca se le creó una Account

      await expect(
        service.updateRole(account1.getId() as number, 'CASHIER'),
      ).rejects.toThrow(ConflictException);
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

    it('404 si la cuenta no existe', async () => {
      await expect(service.updateRole(999, 'ADMIN')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate (US-07)', () => {
    it('da de baja una cuenta de un CASHIER sin restricciones', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({
        employeeId: 2,
        email: 'bruno.perez@vitto.club',
        password: 'secreta123',
      });

      await service.deactivate(account.getId() as number);

      const stored = accountRepo.items.get(account.getId() as number);
      expect(stored?.isActive()).toBe(false);
      expect(sessionRevoker.revokedAccountIds).toContain(account.getId());
    });

    it('bloquea dar de baja al último ADMIN disponible y no revoca sesiones', async () => {
      employeeRepo.seed(ADMIN_EMPLOYEE);
      const account = await service.register({
        employeeId: 1,
        email: 'ana.gomez@vitto.club',
        password: 'secreta123',
      });

      await expect(service.deactivate(account.getId() as number)).rejects.toThrow(ConflictException);
      expect(accountRepo.items.get(account.getId() as number)?.isActive()).toBe(true);
      expect(sessionRevoker.revokedAccountIds).toHaveLength(0);
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
      // Caso defensivo: una Account cuyo employeeId no corresponde a ningún Employee.
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

  describe('deactivateByEmployeeId (baja de Employee -> baja de su Account)', () => {
    it('da de baja la cuenta del empleado si tiene una activa', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({ employeeId: 2, email: 'bruno.perez@vitto.club', password: 'secreta123' });

      await service.deactivateByEmployeeId(2);

      expect(accountRepo.items.get(account.getId() as number)?.isActive()).toBe(false);
    });

    it('no hace nada si el empleado no tiene cuenta', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      await expect(service.deactivateByEmployeeId(2)).resolves.toBeUndefined();
    });

    it('no hace nada si la cuenta ya estaba inactiva', async () => {
      employeeRepo.seed(CASHIER_EMPLOYEE);
      const account = await service.register({ employeeId: 2, email: 'bruno.perez@vitto.club', password: 'secreta123' });
      await service.deactivate(account.getId() as number);
      sessionRevoker.revokedAccountIds.length = 0;

      await service.deactivateByEmployeeId(2);

      expect(sessionRevoker.revokedAccountIds).toHaveLength(0);
    });

    it('respeta la protección del último ADMIN también por esta vía', async () => {
      employeeRepo.seed(ADMIN_EMPLOYEE);
      await service.register({ employeeId: 1, email: 'ana.gomez@vitto.club', password: 'secreta123' });

      await expect(service.deactivateByEmployeeId(1)).rejects.toThrow(ConflictException);
    });
  });
});
