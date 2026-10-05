import { ConflictException, NotFoundException } from '@nestjs/common';
import { EmployeesService } from './employees.service.js';
import { Employee, EmployeeData, EmployeeUpdateData } from '../domain/employee.js';
import { EmployeeListFilters, EmployeeRepository } from '../domain/port/employee.repository.js';
import { DomainError } from '../domain/errors/domain.error.js';
import { AccountsService } from '../../accounts/application/accounts.service.js';
import { Account } from '../../accounts/domain/account.js';
import { AccountRepository } from '../../accounts/domain/port/account.repository.js';
import { PasswordHasher } from '../../accounts/domain/port/password-hasher.js';
import { SessionRevoker } from '../../accounts/domain/port/session-revoker.js';
import type { CustomersService } from '../../customers/application/customers.service.js';

// Doble liviano: EmployeesService solo depende de la forma estructural
// { existsByEmail(email) } (ver EmailUniquenessChecker en employees.service.ts), así que
// no hace falta instanciar ni castear la clase CustomersService real para este test.
class FakeCustomersService {
  readonly emails = new Set<string>();
  async existsByEmail(email: string): Promise<boolean> {
    return this.emails.has(email.toLowerCase());
  }
}

// Doble inerte: para todos los tests que no son de la integración US-07, nunca bloquea ni
// hace nada — igual que si el Employee no tuviera Account. La integración real (con
// AccountsService de verdad, protección del último ADMIN incluida) se prueba aparte, más
// abajo, en el describe de integración.
class InertAccountsService {
  async deactivateByEmployeeId(_employeeId: number): Promise<void> {}
}

// Repositorio en memoria de accounts, para el describe de integración (mismo criterio que
// accounts.service.spec.ts; se duplica acá porque esta suite prueba la orquestación desde
// el lado de EmployeesService, no AccountsService en sí).
class FakeAccountRepository implements AccountRepository {
  readonly items = new Map<number, Account>();
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
  async syncRoleFromEmployee(): Promise<void> {}
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

// Repositorio en memoria solo para los tests (no toca la base de datos)
class FakeEmployeeRepository implements EmployeeRepository {
  readonly items = new Map<number, Employee>();
  private nextId = 1;
  readonly update_ = jest.fn();
  readonly findAll_ = jest.fn();
  readonly updateStatus_ = jest.fn();

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

  // El filtrado real lo hace Prisma (ver employees.repository.spec.ts); acá solo el estado
  async findAll(filters: EmployeeListFilters = {}): Promise<Employee[]> {
    this.findAll_(filters);
    return [...this.items.values()].filter(
      (e) => filters.active === undefined || e.isActive() === filters.active,
    );
  }

  async update(employee: Employee): Promise<void> {
    this.update_(employee);
    this.items.set(employee.getId() as number, employee);
  }

  async updateStatus(employee: Employee): Promise<void> {
    this.updateStatus_(employee);
    this.items.set(employee.getId() as number, employee);
  }

  async existsByEmail(email: string): Promise<boolean> {
    return [...this.items.values()].some((e) => e.getEmail() === email.toLowerCase());
  }
}

describe('EmployeesService', () => {
  let repo: FakeEmployeeRepository;
  let customersService: FakeCustomersService;
  let service: EmployeesService;

  const validData: EmployeeData = {
    firstName: 'Ana',
    lastName: 'Gómez',
    email: 'ana.gomez@vitto.club',
    role: 'ADMIN',
    phone: '3510000001',
  };

  beforeEach(() => {
    repo = new FakeEmployeeRepository();
    customersService = new FakeCustomersService();
    service = new EmployeesService(repo, customersService, new InertAccountsService());
  });

  describe('create()', () => {
    it('registra un empleado activo y le asigna id', async () => {
      const employee = await service.create(validData);

      expect(employee.getId()).toBe(1);
      expect(employee.isActive()).toBe(true);
      expect(employee.getEmail()).toBe('ana.gomez@vitto.club');
      expect(repo.items.size).toBe(1);
    });

    it('registra un empleado sin teléfono', async () => {
      const employee = await service.create({ ...validData, phone: undefined });
      expect(employee.getPhone()).toBeNull();
    });

    it('lanza 409 si el email ya está registrado', async () => {
      await service.create(validData);

      await expect(service.create({ ...validData, firstName: 'Otra' })).rejects.toThrow(
        ConflictException,
      );
      expect(repo.items.size).toBe(1);
    });

    it('detecta el email duplicado sin distinguir mayúsculas ni espacios', async () => {
      await service.create(validData);

      await expect(
        service.create({ ...validData, email: '  ANA.Gomez@Vitto.Club ' }),
      ).rejects.toThrow('already exists');
    });

    it('lanza 409 aunque el empleado con ese email esté dado de baja', async () => {
      repo.items.set(
        99,
        Employee.reconstruct({ ...validData, id: 99, active: false, deactivatedAt: new Date() }),
      );

      await expect(service.create(validData)).rejects.toThrow(ConflictException);
    });

    // Escenario A (unicidad global de email): existe un Customer con ese email -> se
    // rechaza crear un Employee con el mismo email.
    it('lanza 409 si el email ya está registrado como customer', async () => {
      customersService.emails.add(validData.email.toLowerCase());

      await expect(service.create(validData)).rejects.toThrow(ConflictException);
      expect(repo.items.size).toBe(0);
    });

    it('permite crear el empleado si el email no está en uso ni por otro empleado ni por un customer', async () => {
      customersService.emails.add('otro.distinto@vitto.club');

      const employee = await service.create(validData);

      expect(employee.getId()).toBe(1);
    });

    it('no persiste nada si los datos son inválidos', async () => {
      await expect(service.create({ ...validData, firstName: '  ' })).rejects.toThrow(DomainError);
      expect(repo.items.size).toBe(0);
    });
  });

  describe('findAll()', () => {
    it('devuelve un array vacío si no hay empleados', async () => {
      expect(await service.findAll()).toEqual([]);
    });

    it('sin filtros devuelve activos e inactivos', async () => {
      await service.create(validData);
      repo.items.set(
        50,
        Employee.reconstruct({ ...validData, email: 'baja@vitto.club', id: 50, active: false }),
      );

      const employees = await service.findAll();

      expect(employees).toHaveLength(2);
      expect(employees.map((e) => e.isActive())).toEqual([true, false]);
      expect(repo.findAll_).toHaveBeenCalledWith({});
    });

    it('pasa los filtros al repositorio', async () => {
      await service.findAll({ nameContains: 'ana', active: true });

      expect(repo.findAll_).toHaveBeenCalledWith({ nameContains: 'ana', active: true });
    });
  });

  describe('findById()', () => {
    it('devuelve el empleado existente', async () => {
      const created = await service.create(validData);
      const found = await service.findById(created.getId() as number);
      expect(found.getEmail()).toBe('ana.gomez@vitto.club');
    });

    it('lanza 404 si el empleado no existe', async () => {
      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    let id: number;

    const updateData: EmployeeUpdateData = {
      firstName: 'Ana María',
      lastName: 'Gómez Paz',
      role: 'CASHIER',
      phone: '3519999999',
    };

    beforeEach(async () => {
      id = (await service.create(validData)).getId() as number;
    });

    it('actualiza los datos editables y devuelve el empleado', async () => {
      const employee = await service.update(id, updateData);

      expect(employee.getFirstName()).toBe('Ana María');
      expect(employee.getLastName()).toBe('Gómez Paz');
      expect(employee.getRole()).toBe('CASHIER');
      expect(employee.getPhone()).toBe('3519999999');
      expect(repo.update_).toHaveBeenCalledTimes(1);
    });

    it('conserva el email, el id y el estado activo', async () => {
      const employee = await service.update(id, updateData);

      expect(employee.getId()).toBe(id);
      expect(employee.getEmail()).toBe('ana.gomez@vitto.club');
      expect(employee.isActive()).toBe(true);
    });

    it('deja al empleado sin teléfono si phone no se envía', async () => {
      const { phone: _phone, ...withoutPhone } = updateData;

      const employee = await service.update(id, withoutPhone);

      expect(employee.getPhone()).toBeNull();
      expect((await service.findById(id)).getPhone()).toBeNull();
    });

    it('lanza 404 si el empleado no existe', async () => {
      await expect(service.update(999, updateData)).rejects.toThrow(NotFoundException);
      expect(repo.update_).not.toHaveBeenCalled();
    });

    it('lanza 409 si el empleado está inactivo y no lo modifica', async () => {
      repo.items.set(
        50,
        Employee.reconstruct({
          ...validData,
          email: 'baja@vitto.club',
          id: 50,
          active: false,
          deactivatedAt: new Date(),
        }),
      );

      await expect(service.update(50, updateData)).rejects.toThrow(ConflictException);
      await expect(service.update(50, updateData)).rejects.toThrow('inactive');

      const employee = await service.findById(50);
      expect(employee.getFirstName()).toBe('Ana');
      expect(employee.getRole()).toBe('ADMIN');
      expect(repo.update_).not.toHaveBeenCalled();
    });

    it('no persiste nada si los datos son inválidos', async () => {
      await expect(service.update(id, { ...updateData, role: 'X' as never })).rejects.toThrow(
        DomainError,
      );

      expect(repo.update_).not.toHaveBeenCalled();
      expect((await service.findById(id)).getFirstName()).toBe('Ana');
    });
  });

  describe('deactivate()', () => {
    let id: number;

    beforeEach(async () => {
      id = (await service.create(validData)).getId() as number;
    });

    it('da de baja al empleado y devuelve el empleado inactivo con fecha de baja', async () => {
      const employee = await service.deactivate(id);

      expect(employee.isActive()).toBe(false);
      expect(employee.getDeactivatedAt()).toBeInstanceOf(Date);
      expect(repo.updateStatus_).toHaveBeenCalledTimes(1);
    });

    it('conserva el registro y todos sus datos (baja lógica, no física)', async () => {
      await service.deactivate(id);

      const employee = await service.findById(id);
      expect(employee.isActive()).toBe(false);
      expect(employee.getId()).toBe(id);
      expect(employee.getEmail()).toBe('ana.gomez@vitto.club');
      expect(employee.getFirstName()).toBe('Ana');
      expect(employee.getLastName()).toBe('Gómez');
      expect(employee.getPhone()).toBe('3510000001');
      expect(employee.getRole()).toBe('ADMIN');
      expect(repo.items.size).toBe(1);
    });

    it('lanza 404 si el empleado no existe', async () => {
      await expect(service.deactivate(999)).rejects.toThrow(NotFoundException);
      expect(repo.updateStatus_).not.toHaveBeenCalled();
    });

    it('lanza 409 si ya está inactivo, sin persistir ni cambiar la fecha de baja', async () => {
      const first = await service.deactivate(id);
      const deactivatedAt = first.getDeactivatedAt();
      repo.updateStatus_.mockClear();

      await expect(service.deactivate(id)).rejects.toThrow(ConflictException);
      await expect(service.deactivate(id)).rejects.toThrow('already inactive');

      expect(repo.updateStatus_).not.toHaveBeenCalled();
      expect((await service.findById(id)).getDeactivatedAt()).toBe(deactivatedAt);
    });

    it('después de la baja no se puede editar (US-02)', async () => {
      await service.deactivate(id);

      await expect(
        service.update(id, { firstName: 'Otra', lastName: 'Persona', role: 'CASHIER' }),
      ).rejects.toThrow(ConflictException);
    });

    it('después de la baja sigue apareciendo en la consulta (US-03)', async () => {
      await service.deactivate(id);

      expect((await service.findAll()).map((e) => e.getId())).toEqual([id]);
      expect(await service.findAll({ active: false })).toHaveLength(1);
      expect(await service.findAll({ active: true })).toHaveLength(0);
    });

    it('después de la baja el email no se puede volver a registrar (US-01)', async () => {
      await service.deactivate(id);

      await expect(service.create(validData)).rejects.toThrow(ConflictException);
    });

    // US-07: EmployeesService no implementa ninguna regla de ADMIN por su cuenta — con un
    // AccountsService inerte (el de este describe, que nunca bloquea nada), dar de baja a
    // quien sería "el único ADMIN" si hubiera un AccountsService real debe funcionar sin
    // que EmployeesService se queje. Si acá hubiera lógica de último ADMIN duplicada,
    // este test fallaría.
    it('no duplica la protección del último ADMIN: con un AccountsService inerte, la baja no se bloquea sola', async () => {
      const employee = await service.deactivate(id);
      expect(employee.isActive()).toBe(false);
    });
  });

  // US-07 (integración real): baja de Employee -> baja de su Account, con AccountsService
  // de verdad (no el doble inerte de arriba) wireado en ambas direcciones. AccountsService
  // y EmployeesService se referencian mutuamente -- igual que en el DI real de Nest
  // (resuelto con forwardRef), en el test se resuelve con una indirección mutable: se
  // construye EmployeesService primero apuntando a un delegado cuyo "accountsService real"
  // todavía no existe, y se lo asigna apenas AccountsService se construye.
  describe('integración con Account (US-07): baja de Employee -> baja de Account', () => {
    function buildIntegratedServices() {
      const employeeRepo = new FakeEmployeeRepository();
      const accountRepo = new FakeAccountRepository();
      const customers = new FakeCustomersService();
      const passwordHasher = new FakePasswordHasher();
      const sessionRevoker = new FakeSessionRevoker();

      const accountsServiceRef: { current?: AccountsService } = {};
      const employees = new EmployeesService(employeeRepo, customers, {
        deactivateByEmployeeId: (employeeId: number) =>
          accountsServiceRef.current!.deactivateByEmployeeId(employeeId),
      });
      const accounts = new AccountsService(
        accountRepo,
        employees,
        customers as unknown as CustomersService,
        passwordHasher,
        sessionRevoker,
      );
      accountsServiceRef.current = accounts;

      return { employeeRepo, accountRepo, employees, accounts, sessionRevoker };
    }

    it('Employee sin Account: la baja sigue normalmente', async () => {
      const { employeeRepo, employees } = buildIntegratedServices();
      const employee = await employees.create({
        firstName: 'Bruno', lastName: 'Pérez', email: 'bruno@vitto.club', role: 'CASHIER', phone: null,
      });

      const deactivated = await employees.deactivate(employee.getId() as number);

      expect(deactivated.isActive()).toBe(false);
      expect(employeeRepo.items.get(employee.getId() as number)?.isActive()).toBe(false);
    });

    it('Employee con Account CASHIER activa: Account se desactiva y Employee se desactiva', async () => {
      const { employeeRepo, accountRepo, employees, accounts, sessionRevoker } = buildIntegratedServices();
      const employee = await employees.create({
        firstName: 'Bruno', lastName: 'Pérez', email: 'bruno@vitto.club', role: 'CASHIER', phone: null,
      });
      const account = await accounts.register({
        employeeId: employee.getId() as number,
        email: 'bruno@vitto.club',
        password: 'secreta123',
      });

      await employees.deactivate(employee.getId() as number);

      expect(employeeRepo.items.get(employee.getId() as number)?.isActive()).toBe(false);
      expect(accountRepo.items.get(account.getId() as number)?.isActive()).toBe(false);
      expect(sessionRevoker.revokedAccountIds).toContain(account.getId());
    });

    it('Employee ADMIN con otro ADMIN disponible: Account se desactiva y Employee se desactiva', async () => {
      const { employeeRepo, accountRepo, employees, accounts } = buildIntegratedServices();
      const admin1 = await employees.create({
        firstName: 'Ana', lastName: 'Gómez', email: 'ana@vitto.club', role: 'ADMIN', phone: null,
      });
      const admin2 = await employees.create({
        firstName: 'Carla', lastName: 'Martínez', email: 'carla@vitto.club', role: 'ADMIN', phone: null,
      });
      const account1 = await accounts.register({
        employeeId: admin1.getId() as number, email: 'ana@vitto.club', password: 'secreta123',
      });
      await accounts.register({
        employeeId: admin2.getId() as number, email: 'carla@vitto.club', password: 'secreta123',
      });

      await employees.deactivate(admin1.getId() as number);

      expect(employeeRepo.items.get(admin1.getId() as number)?.isActive()).toBe(false);
      expect(accountRepo.items.get(account1.getId() as number)?.isActive()).toBe(false);
    });

    it('Employee es el último ADMIN disponible: se bloquea TODA la operación', async () => {
      const { employeeRepo, accountRepo, employees, accounts, sessionRevoker } = buildIntegratedServices();
      const admin = await employees.create({
        firstName: 'Ana', lastName: 'Gómez', email: 'ana@vitto.club', role: 'ADMIN', phone: null,
      });
      const account = await accounts.register({
        employeeId: admin.getId() as number, email: 'ana@vitto.club', password: 'secreta123',
      });

      // 5. La excepción de AccountsService se propaga sin capturarse ni transformarse.
      await expect(employees.deactivate(admin.getId() as number)).rejects.toThrow(ConflictException);
      await expect(employees.deactivate(admin.getId() as number)).rejects.toThrow(
        'without an available administrator',
      );

      // 4. Ni el Employee ni la Account quedan modificados: nunca Employee inactivo +
      // Account activa, ni Account tocada a medias.
      expect(employeeRepo.items.get(admin.getId() as number)?.isActive()).toBe(true);
      expect(accountRepo.items.get(account.getId() as number)?.isActive()).toBe(true);
      expect(sessionRevoker.revokedAccountIds).toHaveLength(0);
    });
  });
});
