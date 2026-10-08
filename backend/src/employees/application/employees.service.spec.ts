import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmployeesService } from './employees.service.js';
import { Employee, EmployeeData, EmployeeUpdateData } from '../domain/employee.js';
import { EmployeeListFilters, EmployeeRepository } from '../domain/port/employee.repository.js';
import { TransactionRunner as EmployeeTransactionRunnerPort } from '../domain/port/transaction-runner.js';
import { DomainError } from '../domain/errors/domain.error.js';
import { AccountsService } from '../../accounts/application/accounts.service.js';
import { EmployeeEventsListener } from '../../accounts/application/employee-events.listener.js';
import { Account } from '../../accounts/domain/account.js';
import { AccountRepository, type CustomerLoginRecord } from '../../accounts/domain/port/account.repository.js';
import { PasswordHasher } from '../../accounts/domain/port/password-hasher.js';
import { TransactionRunner as AccountTransactionRunnerPort } from '../../accounts/domain/port/transaction-runner.js';
import { EMPLOYEE_DEACTIVATED, EMPLOYEE_ROLE_CHANGED } from '../../shared/events/domain-events.js';
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

// Passthrough sin snapshot/restore: para los tests que no son de la integración US-07 no
// hace falta simular commit/rollback, solo que run() ejecute fn.
class PassthroughTransactionRunner implements EmployeeTransactionRunnerPort {
  async run<T>(fn: () => Promise<T>): Promise<T> {
    return fn();
  }
}

class FakeEventEmitter {
  async emitAsync(): Promise<unknown[]> {
    return [];
  }
}

// Repositorio en memoria solo para los tests (no toca la base de datos)
class FakeEmployeeRepository implements EmployeeRepository {
  items = new Map<number, Employee>();
  private nextId = 1;
  private snapshotData: Map<number, Employee> | null = null;
  readonly update_ = jest.fn();
  readonly findAll_ = jest.fn();
  readonly updateStatus_ = jest.fn();

  private clone(employee: Employee): Employee {
    return Employee.reconstruct({
      id: employee.getId() as number,
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
  }

  // Usado solo por la integración con transacción real (ver buildIntegratedServices):
  // congela el estado actual para poder deshacerlo si la transacción falla.
  snapshot(): void {
    this.snapshotData = new Map([...this.items].map(([id, e]) => [id, this.clone(e)]));
  }
  restore(): void {
    if (!this.snapshotData) return;
    this.items = new Map([...this.snapshotData].map(([id, e]) => [id, this.clone(e)]));
  }

  async save(employee: Employee): Promise<Employee> {
    const id = this.nextId++;
    const saved = this.clone(
      Employee.reconstruct({
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
      }),
    );
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
    service = new EmployeesService(
      repo,
      new PassthroughTransactionRunner(),
      new FakeEventEmitter() as unknown as EventEmitter2,
    );
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

    // Decisión vigente: la unicidad global de email quedó en una sola dirección,
    // Customers -> Employees (ver customers.service.ts). EmployeesService.create() ya NO
    // consulta a customers de ninguna forma — no hay ningún constructor param ni mecanismo
    // para hacerlo. Este test documenta esa ausencia: crear un empleado nunca depende de
    // nada fuera de employeesRepository, aunque el email "ya exista" como customer en la
    // base real (ese conflicto se detecta recién al intentar crear la Account, por
    // Account.email @unique — riesgo aceptado explícitamente por el equipo).
    it('ya no valida unicidad cruzada contra customers (Employees -> Customers se eliminó)', async () => {
      const employee = await service.create(validData);

      expect(employee.getId()).toBe(1);
      expect(employee.isActive()).toBe(true);
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

    it('si el rol no cambia, no publica employee.role-changed', async () => {
      const emitAsync = jest.fn().mockResolvedValue([]);
      service = new EmployeesService(repo, new PassthroughTransactionRunner(), {
        emitAsync,
      } as unknown as EventEmitter2);

      await service.update(id, { ...updateData, role: validData.role });

      expect(emitAsync).not.toHaveBeenCalled();
    });

    it('si el rol cambia, publica employee.role-changed con previousRole/newRole', async () => {
      const emitAsync = jest.fn().mockResolvedValue([]);
      service = new EmployeesService(repo, new PassthroughTransactionRunner(), {
        emitAsync,
      } as unknown as EventEmitter2);

      await service.update(id, updateData); // role: ADMIN -> CASHIER

      expect(emitAsync).toHaveBeenCalledWith(EMPLOYEE_ROLE_CHANGED, {
        employeeId: id,
        previousRole: 'ADMIN',
        newRole: 'CASHIER',
      });
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

    it('publica employee.deactivated con el employeeId', async () => {
      const emitAsync = jest.fn().mockResolvedValue([]);
      service = new EmployeesService(repo, new PassthroughTransactionRunner(), {
        emitAsync,
      } as unknown as EventEmitter2);
      const freshId = (await service.create({ ...validData, email: 'otra@vitto.club' })).getId() as number;

      await service.deactivate(freshId);

      expect(emitAsync).toHaveBeenCalledWith(EMPLOYEE_DEACTIVATED, { employeeId: freshId });
    });

    // EmployeesService ya no conoce a AccountsService en absoluto (ni import, ni
    // forwardRef, ni interfaz estructural): si acá hubiera alguna regla de ADMIN
    // duplicada, tendría que estar escrita en este archivo, y no lo está — la baja
    // funciona sin ningún listener registrado (emitAsync de FakeEventEmitter no hace
    // nada), lo cual prueba que EmployeesService no depende de que exista un listener
    // para completar su propia baja.
    it('no duplica ninguna regla de ADMIN: la baja se completa aunque nadie escuche el evento', async () => {
      const employee = await service.deactivate(id);
      expect(employee.isActive()).toBe(false);
    });
  });

  // US-07/US-06 (integración real): baja de Employee -> evento employee.deactivated ->
  // listener en accounts -> baja de Account (o bloqueo); cambio de rol -> evento
  // employee.role-changed -> listener -> sync de Account.role (o bloqueo). Todo dentro de
  // una transacción compartida simulada: si el listener tira, se revierte tanto el cambio
  // de Employee como el de Account.
  describe('integración por eventos con accounts (US-06/US-07)', () => {
    class FakeAccountRepository implements AccountRepository {
      items = new Map<number, Account>();
      private nextId = 1;
      private snapshotData: Map<number, Account> | null = null;
      readonly syncedRoles: { accountId: number; role: string }[] = [];

      // Mismo criterio que AccountPrismaRepository.save(): el email se copia de
      // Employee.email en el momento de persistir.
      constructor(private readonly employeeRepo: FakeEmployeeRepository) {}

      private clone(account: Account): Account {
        return Account.reconstruct({
          id: account.getId() as number,
          employeeId: account.getEmployeeId(),
          email: account.getEmail() as string,
          passwordHash: account.getPasswordHash(),
          active: account.isActive(),
          deactivatedAt: account.getDeactivatedAt(),
          createdAt: account.getCreatedAt(),
          updatedAt: account.getUpdatedAt(),
        });
      }
      snapshot(): void {
        this.snapshotData = new Map([...this.items].map(([id, a]) => [id, this.clone(a)]));
      }
      restore(): void {
        if (!this.snapshotData) return;
        this.items = new Map([...this.snapshotData].map(([id, a]) => [id, this.clone(a)]));
      }

      async save(account: Account): Promise<Account> {
        const id = this.nextId++;
        const employee = await this.employeeRepo.findById(account.getEmployeeId());
        const saved = this.clone(
          Account.reconstruct({
            id,
            employeeId: account.getEmployeeId(),
            email: employee?.getEmail() as string,
            passwordHash: account.getPasswordHash(),
            active: account.isActive(),
            deactivatedAt: account.getDeactivatedAt(),
            createdAt: account.getCreatedAt(),
            updatedAt: account.getUpdatedAt(),
          }),
        );
        this.items.set(id, saved);
        return saved;
      }
      async findById(id: number): Promise<Account | null> {
        return this.items.get(id) ?? null;
      }
      async findByEmployeeId(employeeId: number): Promise<Account | null> {
        return [...this.items.values()].find((a) => a.getEmployeeId() === employeeId) ?? null;
      }
      async findByEmail(): Promise<Account | null> {
        throw new Error('not implemented: no usado en esta suite');
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
        const account = this.items.get(accountId);
        if (account) this.items.set(accountId, account);
      }
      async countActiveByEmployeeIds(employeeIds: number[]): Promise<number> {
        return [...this.items.values()].filter(
          (a) => a.isActive() && employeeIds.includes(a.getEmployeeId()),
        ).length;
      }
      // Cuentas de cliente: no se usan en esta suite (solo prueba empleados)
      async findCustomerLoginByEmail(): Promise<CustomerLoginRecord | null> {
        return null;
      }
      async findCustomerLoginById(): Promise<CustomerLoginRecord | null> {
        return null;
      }
      async updateEmailByCustomerId(): Promise<void> {}
    }

    class FakePasswordHasher implements PasswordHasher {
      async hash(plainPassword: string): Promise<string> {
        return `hashed:${plainPassword}`;
      }
      async verify(plainPassword: string, passwordHash: string): Promise<boolean> {
        return passwordHash === `hashed:${plainPassword}`;
      }
    }

    // Transacción simulada compartida entre employees y accounts: toma una foto de ambos
    // repositorios antes de la llamada MÁS externa a run() (anidado se suma a la misma,
    // igual que la real) y, si algo tira, restaura esa foto en los dos a la vez. Así se
    // prueba el "rollback de ambas escrituras" sin necesitar una base de datos real.
    class SharedFakeTransactionRunner implements EmployeeTransactionRunnerPort, AccountTransactionRunnerPort {
      private depth = 0;
      constructor(private readonly repos: { snapshot(): void; restore(): void }[]) {}

      async run<T>(fn: () => Promise<T>): Promise<T> {
        const isOutermost = this.depth === 0;
        if (isOutermost) this.repos.forEach((r) => r.snapshot());
        this.depth++;
        try {
          const result = await fn();
          this.depth--;
          return result;
        } catch (err) {
          this.depth--;
          if (isOutermost) this.repos.forEach((r) => r.restore());
          throw err;
        }
      }
    }

    function buildIntegratedServices() {
      const employeeRepo = new FakeEmployeeRepository();
      const accountRepo = new FakeAccountRepository(employeeRepo);
      const customers = new FakeCustomersService();
      const passwordHasher = new FakePasswordHasher();
      const eventEmitter = new EventEmitter2();
      const transactionRunner = new SharedFakeTransactionRunner([employeeRepo, accountRepo]);

      const employees = new EmployeesService(employeeRepo, transactionRunner, eventEmitter);
      const accounts = new AccountsService(
        accountRepo,
        employees,
        customers as unknown as CustomersService,
        passwordHasher,
        transactionRunner,
        eventEmitter,
      );
      const listener = new EmployeeEventsListener(accounts);
      // Igual que @OnEvent({ suppressErrors: false }): si el listener tira, emitAsync
      // rechaza y ese rechazo se propaga hasta quien publicó el evento.
      eventEmitter.on(EMPLOYEE_DEACTIVATED, (event) => listener.onEmployeeDeactivated(event));
      eventEmitter.on(EMPLOYEE_ROLE_CHANGED, (event) => listener.onEmployeeRoleChanged(event));

      return { employeeRepo, accountRepo, employees, accounts };
    }

    describe('employee.deactivated', () => {
      it('Employee sin Account: la baja sigue normalmente', async () => {
        const { employeeRepo, employees } = buildIntegratedServices();
        const employee = await employees.create({
          firstName: 'Bruno', lastName: 'Pérez', email: 'bruno@vitto.club', role: 'CASHIER', phone: null,
        });

        const deactivated = await employees.deactivate(employee.getId() as number);

        expect(deactivated.isActive()).toBe(false);
        expect(employeeRepo.items.get(employee.getId() as number)?.isActive()).toBe(false);
      });

      it('Employee con Account activa: Account se desactiva y Employee se desactiva (commit total)', async () => {
        const { employeeRepo, accountRepo, employees, accounts } = buildIntegratedServices();
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
      });

      it('Employee con Account ya inactiva: no hace nada raro, Employee se desactiva igual', async () => {
        const { employeeRepo, accountRepo, employees, accounts } = buildIntegratedServices();
        const employee = await employees.create({
          firstName: 'Bruno', lastName: 'Pérez', email: 'bruno@vitto.club', role: 'CASHIER', phone: null,
        });
        const account = await accounts.register({
          employeeId: employee.getId() as number,
          email: 'bruno@vitto.club',
          password: 'secreta123',
        });
        await accounts.deactivate(account.getId() as number);

        await employees.deactivate(employee.getId() as number);

        expect(employeeRepo.items.get(employee.getId() as number)?.isActive()).toBe(false);
        expect(accountRepo.items.get(account.getId() as number)?.isActive()).toBe(false);
      });

      it('último ADMIN disponible: rollback total (Employee y Account quedan sin tocar)', async () => {
        const { employeeRepo, accountRepo, employees, accounts } = buildIntegratedServices();
        const admin = await employees.create({
          firstName: 'Ana', lastName: 'Gómez', email: 'ana@vitto.club', role: 'ADMIN', phone: null,
        });
        const account = await accounts.register({
          employeeId: admin.getId() as number, email: 'ana@vitto.club', password: 'secreta123',
        });

        await expect(employees.deactivate(admin.getId() as number)).rejects.toThrow(
          ConflictException,
        );
        await expect(employees.deactivate(admin.getId() as number)).rejects.toThrow(
          'without an available administrator',
        );

        expect(employeeRepo.items.get(admin.getId() as number)?.isActive()).toBe(true);
        expect(accountRepo.items.get(account.getId() as number)?.isActive()).toBe(true);
      });

      it('otro ADMIN disponible: commit total (Employee y Account quedan dados de baja)', async () => {
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
    });

    describe('employee.role-changed', () => {
      it('rol no cambia -> no emite evento -> Account.role no se toca', async () => {
        const { accountRepo, employees, accounts } = buildIntegratedServices();
        const employee = await employees.create({
          firstName: 'Bruno', lastName: 'Pérez', email: 'bruno@vitto.club', role: 'CASHIER', phone: null,
        });
        await accounts.register({
          employeeId: employee.getId() as number, email: 'bruno@vitto.club', password: 'secreta123',
        });

        await employees.update(employee.getId() as number, {
          firstName: 'Bruno', lastName: 'Pérez', role: 'CASHIER', phone: null,
        });

        expect(accountRepo.syncedRoles).toHaveLength(0);
      });

      it('ADMIN -> CASHIER con otro ADMIN disponible: commit, Account.role queda sincronizado', async () => {
        const { accountRepo, employeeRepo, employees, accounts } = buildIntegratedServices();
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

        await employees.update(admin1.getId() as number, {
          firstName: 'Ana', lastName: 'Gómez', role: 'CASHIER', phone: null,
        });

        expect(employeeRepo.items.get(admin1.getId() as number)?.getRole()).toBe('CASHIER');
        expect(accountRepo.syncedRoles).toEqual([{ accountId: account1.getId(), role: 'CASHIER' }]);
      });

      it('último ADMIN: rollback total (Employee.role y Account.role quedan sin tocar)', async () => {
        const { accountRepo, employeeRepo, employees, accounts } = buildIntegratedServices();
        const admin = await employees.create({
          firstName: 'Ana', lastName: 'Gómez', email: 'ana@vitto.club', role: 'ADMIN', phone: null,
        });
        await accounts.register({
          employeeId: admin.getId() as number, email: 'ana@vitto.club', password: 'secreta123',
        });

        await expect(
          employees.update(admin.getId() as number, {
            firstName: 'Ana', lastName: 'Gómez', role: 'CASHIER', phone: null,
          }),
        ).rejects.toThrow(ConflictException);

        // Rollback: el rol de Employee queda como estaba (ADMIN), y nunca se sincronizó Account.role
        expect(employeeRepo.items.get(admin.getId() as number)?.getRole()).toBe('ADMIN');
        expect(accountRepo.syncedRoles).toHaveLength(0);
      });
    });
  });
});
