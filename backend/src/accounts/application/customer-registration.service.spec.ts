import { BadRequestException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CustomerRegistrationService,
  REGISTRATION_DATA_TAKEN,
  REGISTRATION_EMAIL_TAKEN,
  registrationDocumentTaken,
} from './customer-registration.service.js';
import type { RegisterCustomerInput } from './customer-registration.service.js';
import { CustomerAccountRepository, type AccountByEmail } from '../domain/port/customer-account.repository.js';
import { PasswordHasher } from '../domain/port/password-hasher.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import { DomainError } from '../domain/errors/domain.error.js';
import { EmployeesService } from '../../employees/application/employees.service.js';
import { CustomersService } from '../../customers/application/customers.service.js';
import { Customer, DocumentType } from '../../customers/domain/customer.js';
import { CustomerListResult, CustomerRepository } from '../../customers/domain/port/customer.repository.js';
import { CustomerStatusChange } from '../../customers/domain/customer-status-change.js';
import { TransactionRunner as CustomerTransactionRunner } from '../../customers/domain/port/transaction-runner.js';

// SCRUM-160: registro de clientes. Fakes en memoria con una transacción que se puede
// deshacer, para comprobar que nunca queda un cliente sin cuenta (ni al revés).

class FakeCustomerRepository implements CustomerRepository {
  items = new Map<number, Customer>();
  private nextId = 1;

  async save(customer: Customer): Promise<Customer> {
    const id = this.nextId++;
    const saved = Customer.reconstruct({
      id,
      firstName: customer.getFirstName(),
      lastName: customer.getLastName(),
      documentType: customer.getDocumentType(),
      documentNumber: customer.getDocumentNumber(),
      email: customer.getEmail(),
      phone: customer.getPhone(),
      dateOfBirth: customer.getDateOfBirth(),
      active: customer.isActive(),
    });
    this.items.set(id, saved);
    return saved;
  }
  async findById(id: number): Promise<Customer | null> {
    return this.items.get(id) ?? null;
  }
  // Solo clientes activos, igual que el repositorio real
  async existsByDocument(type: DocumentType, number: string): Promise<boolean> {
    return [...this.items.values()].some(
      (c) => c.isActive() && c.getDocumentType() === type && c.getDocumentNumber() === number,
    );
  }
  async existsByEmail(email: string, options: { onlyActive?: boolean } = {}): Promise<boolean> {
    return [...this.items.values()].some(
      (c) => (!options.onlyActive || c.isActive()) && c.getEmail() === email.toLowerCase(),
    );
  }
  async findAll(): Promise<Customer[]> { return [...this.items.values()]; }
  async findByDocument(): Promise<Customer | null> { throw new Error('not implemented'); }
  async update(): Promise<void> { throw new Error('not implemented'); }
  async updateStatus(): Promise<void> { throw new Error('not implemented'); }
  async findStatusHistory(): Promise<CustomerStatusChange[]> { throw new Error('not implemented'); }
  async list(): Promise<CustomerListResult> { throw new Error('not implemented'); }

  // Helper de test: un cliente ya persistido
  seed(data: { id: number; documentNumber: string; email: string; active: boolean }): void {
    this.items.set(
      data.id,
      Customer.reconstruct({
        id: data.id,
        firstName: 'Ana',
        lastName: 'Previa',
        documentType: 'DNI',
        documentNumber: data.documentNumber,
        email: data.email,
        active: data.active,
      }),
    );
    if (data.id >= this.nextId) this.nextId = data.id + 1;
  }
}

type AccountRow = AccountByEmail & { email: string; passwordHash: string };

class FakeCustomerAccountRepository implements CustomerAccountRepository {
  rows = new Map<number, AccountRow>();
  private nextId = 1;
  readonly create = jest.fn(async (data: { customerId: number; email: string; passwordHash: string }) => {
    const accountId = this.nextId++;
    this.rows.set(accountId, { accountId, employeeId: null, active: true, ...data });
    return { accountId };
  });

  async findByEmail(email: string): Promise<AccountByEmail | null> {
    const row = [...this.rows.values()]
      .filter((r) => r.email === email)
      .sort((a, b) => Number(b.active) - Number(a.active))[0];
    return row
      ? { accountId: row.accountId, customerId: row.customerId, employeeId: row.employeeId, active: row.active }
      : null;
  }
  async deactivate(accountId: number): Promise<void> {
    const row = this.rows.get(accountId);
    if (row) this.rows.set(accountId, { ...row, active: false });
  }

  seed(row: AccountRow): void {
    this.rows.set(row.accountId, row);
    if (row.accountId >= this.nextId) this.nextId = row.accountId + 1;
  }
  customerAccounts(): AccountRow[] {
    return [...this.rows.values()].filter((r) => r.customerId !== null);
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

// Transacción en memoria: guarda una copia de los dos repositorios y la restaura si fn tira,
// igual que un rollback. Anidada (customers abre la suya dentro) se suma a la de afuera.
class RollbackTransactionRunner implements TransactionRunner, CustomerTransactionRunner {
  private depth = 0;

  constructor(
    private readonly customers: FakeCustomerRepository,
    private readonly accounts: FakeCustomerAccountRepository,
  ) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.depth > 0) return await fn();

    const customers = new Map(this.customers.items);
    const rows = new Map(this.accounts.rows);
    this.depth++;
    try {
      return await fn();
    } catch (error) {
      this.customers.items = customers;
      this.accounts.rows = rows;
      throw error;
    } finally {
      this.depth--;
    }
  }
}

const input = (overrides: Partial<RegisterCustomerInput> = {}): RegisterCustomerInput => ({
  firstName: 'Lucía',
  lastName: 'Fernández',
  documentType: 'DNI',
  documentNumber: '40.123.456',
  email: ' Lucia@Example.com ',
  password: 'secreta123',
  ...overrides,
});

describe('CustomerRegistrationService (SCRUM-160)', () => {
  let customerRepo: FakeCustomerRepository;
  let accounts: FakeCustomerAccountRepository;
  let employeeEmails: Set<string>;
  let hasher: FakePasswordHasher;
  let runner: RollbackTransactionRunner;
  let service: CustomerRegistrationService;

  beforeEach(() => {
    customerRepo = new FakeCustomerRepository();
    accounts = new FakeCustomerAccountRepository();
    employeeEmails = new Set<string>();
    hasher = new FakePasswordHasher();
    runner = new RollbackTransactionRunner(customerRepo, accounts);

    const employeesService = {
      existsByEmail: async (email: string) => employeeEmails.has(email.toLowerCase()),
    } as unknown as EmployeesService;
    const eventEmitter = { emitAsync: jest.fn().mockResolvedValue([]) } as unknown as EventEmitter2;
    const customersService = new CustomersService(customerRepo, employeesService, runner, eventEmitter);

    service = new CustomerRegistrationService(accounts, customersService, employeesService, hasher, runner);
  });

  const expectNothingCreated = () => {
    expect(customerRepo.items.size).toBe(0);
    expect(accounts.customerAccounts()).toHaveLength(0);
  };

  it('crea el cliente y su cuenta CUSTOMER con el email normalizado y la contraseña hasheada', async () => {
    const result = await service.register(input());

    expect(result).toEqual({
      customerId: 1,
      email: 'lucia@example.com',
      firstName: 'Lucía',
      lastName: 'Fernández',
    });
    const customer = customerRepo.items.get(1) as Customer;
    expect(customer.getDocumentNumber()).toBe('40123456');
    expect(customer.isActive()).toBe(true);
    expect(accounts.create).toHaveBeenCalledWith({
      customerId: 1,
      email: 'lucia@example.com',
      passwordHash: 'hashed:secreta123',
    });
  });

  it('hashea la contraseña antes de abrir la transacción', async () => {
    const order: string[] = [];
    hasher.hash = async (plain: string) => {
      order.push('hash');
      return `hashed:${plain}`;
    };
    const run = runner.run.bind(runner);
    runner.run = async <T>(fn: () => Promise<T>) => {
      order.push('run');
      return await run(fn);
    };

    await service.register(input());

    expect(order[0]).toBe('hash');
    expect(order).toContain('run');
  });

  it('acepta teléfono y fecha de nacimiento opcionales', async () => {
    await service.register(input({ phone: '1155555555', dateOfBirth: '1998-05-14' }));

    const customer = customerRepo.items.get(1) as Customer;
    expect(customer.getPhone()).toBe('1155555555');
    expect(customer.getDateOfBirth()).toEqual(new Date('1998-05-14'));
  });

  describe('contraseña', () => {
    it('rechaza una contraseña de menos de 8 caracteres y no crea nada', async () => {
      await expect(service.register(input({ password: 'corta12' }))).rejects.toThrow(DomainError);
      expectNothingCreated();
    });

    it('rechaza una contraseña de más de 72 bytes (letras con tilde cuentan 2)', async () => {
      await expect(service.register(input({ password: 'á'.repeat(40) }))).rejects.toThrow(DomainError);
      expectNothingCreated();
    });

    it('rechaza una contraseña igual al email (normalizado) y no crea nada', async () => {
      await expect(
        service.register(input({ email: 'lucia@example.com', password: 'lucia@example.com' })),
      ).rejects.toThrow(BadRequestException);
      expectNothingCreated();
    });
  });

  describe('datos ya registrados (409)', () => {
    it('documento de un cliente activo: dice que el repetido es el documento', async () => {
      customerRepo.seed({ id: 9, documentNumber: '40123456', email: 'otra@example.com', active: true });

      const error = await service.register(input()).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({
        message: registrationDocumentTaken('DNI'),
        details: [{ field: 'documentNumber', message: registrationDocumentTaken('DNI') }],
      });
      expect(customerRepo.items.size).toBe(1);
      expect(accounts.customerAccounts()).toHaveLength(0);
    });

    it('email de un cliente activo: dice que el repetido es el email', async () => {
      customerRepo.seed({ id: 9, documentNumber: '30111222', email: 'lucia@example.com', active: true });

      const error = await service.register(input()).catch((e: unknown) => e);

      expect((error as ConflictException).getResponse()).toMatchObject({
        message: REGISTRATION_EMAIL_TAKEN,
        details: [{ field: 'email', message: REGISTRATION_EMAIL_TAKEN }],
      });
      expect(accounts.customerAccounts()).toHaveLength(0);
    });

    it('email de un empleado: 409 por el email', async () => {
      employeeEmails.add('lucia@example.com');

      await expect(service.register(input())).rejects.toThrow(REGISTRATION_EMAIL_TAKEN);
      expectNothingCreated();
    });

    it('email de una cuenta de empleado: 409 por el email', async () => {
      accounts.seed({
        accountId: 70,
        customerId: null,
        employeeId: 3,
        active: true,
        email: 'lucia@example.com',
        passwordHash: 'hashed:x',
      });

      await expect(service.register(input())).rejects.toThrow(REGISTRATION_EMAIL_TAKEN);
      expect(customerRepo.items.size).toBe(0);
    });

    it('los mensajes sugieren comunicarse con el restaurante', () => {
      for (const message of [registrationDocumentTaken('DNI'), REGISTRATION_EMAIL_TAKEN, REGISTRATION_DATA_TAKEN]) {
        expect(message).toContain('comunicate con el restaurante');
      }
    });

    // La pantalla de registro deduce el campo repetido del texto del 409 (RegisterPage.tsx,
    // conflictField): /\bemail\b/i marca el email y /\b(DNI|PASSPORT)\b/i el documento.
    it('cada mensaje lo reconoce la pantalla de registro como su campo', () => {
      const field = (message: string) =>
        /\bemail\b/i.test(message) ? 'email' : /\b(DNI|PASSPORT)\b/i.test(message) ? 'documentNumber' : undefined;

      expect(field(registrationDocumentTaken('DNI'))).toBe('documentNumber');
      expect(field(registrationDocumentTaken('PASSPORT'))).toBe('documentNumber');
      expect(field(REGISTRATION_EMAIL_TAKEN)).toBe('email');
      // La carrera no sabe cuál de los dos fue: la pantalla lo muestra como error general
      expect(field(REGISTRATION_DATA_TAKEN)).toBeUndefined();
    });
  });

  describe('cliente dado de baja que vuelve (decisión del PO)', () => {
    beforeEach(() => {
      customerRepo.seed({ id: 9, documentNumber: '40123456', email: 'lucia@example.com', active: false });
      accounts.seed({
        accountId: 50,
        customerId: 9,
        employeeId: null,
        active: true,
        email: 'lucia@example.com',
        passwordHash: 'hashed:vieja1234',
      });
    });

    it('se registra como un cliente nuevo y conserva el registro anterior', async () => {
      const result = await service.register(input());

      expect(result.customerId).not.toBe(9);
      expect((customerRepo.items.get(9) as Customer).isActive()).toBe(false);
      expect((customerRepo.items.get(result.customerId) as Customer).isActive()).toBe(true);
    });

    it('desactiva la cuenta vieja para liberar el email', async () => {
      const result = await service.register(input());

      expect(accounts.rows.get(50)?.active).toBe(false);
      const fresh = accounts.customerAccounts().find((r) => r.customerId === result.customerId);
      expect(fresh).toMatchObject({ email: 'lucia@example.com', active: true });
    });

    it('si el registro falla, la cuenta vieja no queda desactivada', async () => {
      accounts.create.mockRejectedValueOnce(new Error('db down'));

      await expect(service.register(input())).rejects.toThrow('db down');
      expect(accounts.rows.get(50)?.active).toBe(true);
    });
  });

  describe('todo o nada (transacción)', () => {
    it('si falla la creación de la cuenta, no queda el cliente', async () => {
      accounts.create.mockRejectedValueOnce(new Error('db down'));

      await expect(service.register(input())).rejects.toThrow('db down');
      expectNothingCreated();
    });

    it('si otro registro gana la carrera, responde el 409 del registro y no deja nada', async () => {
      // Entre el chequeo y la escritura alguien registró el mismo documento
      const create = customerRepo.save.bind(customerRepo);
      customerRepo.save = async (_customer: Customer) => {
        customerRepo.seed({ id: 99, documentNumber: '40123456', email: 'otro@example.com', active: true });
        customerRepo.save = create;
        throw new ConflictException('An active customer with DNI "40123456" already exists');
      };

      await expect(service.register(input())).rejects.toThrow(REGISTRATION_DATA_TAKEN);
      expect(accounts.customerAccounts()).toHaveLength(0);
    });
  });
});
