import { BadRequestException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AccountsService,
  REGISTRATION_DATA_TAKEN,
  REGISTRATION_DOCUMENT_TAKEN,
  REGISTRATION_EMAIL_TAKEN,
} from './accounts.service.js';
import type { RegisterCustomerInput } from './accounts.service.js';
import { Account } from '../domain/account.js';
import { AccountRepository, type CustomerLoginRecord } from '../domain/port/account.repository.js';
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
  async existsByEmail(email: string): Promise<boolean> {
    return [...this.items.values()].some((c) => c.isActive() && c.getEmail() === email.toLowerCase());
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

class FakeAccountRepository implements AccountRepository {
  customerLogins = new Map<number, CustomerLoginRecord>();
  // Emails de cuentas de empleado (lo único que mira el registro de ellas)
  readonly employeeAccountEmails = new Set<string>();
  readonly createCustomerAccount = jest.fn(
    async (data: { customerId: number; email: string; passwordHash: string }) => {
      const record = { accountId: this.nextId++, ...data, active: true };
      this.customerLogins.set(record.accountId, record);
      return record;
    },
  );
  private nextId = 1;

  async findByEmail(email: string): Promise<Account | null> {
    return this.employeeAccountEmails.has(email) ? ({} as Account) : null;
  }
  async findCustomerLoginByEmail(email: string): Promise<CustomerLoginRecord | null> {
    return [...this.customerLogins.values()].find((r) => r.email === email && r.active) ?? null;
  }
  async deactivateCustomerAccount(accountId: number): Promise<void> {
    const record = this.customerLogins.get(accountId);
    if (record) this.customerLogins.set(accountId, { ...record, active: false });
  }
  async findCustomerLoginById(accountId: number): Promise<CustomerLoginRecord | null> {
    return this.customerLogins.get(accountId) ?? null;
  }
  async save(): Promise<Account> { throw new Error('not implemented'); }
  async findById(): Promise<Account | null> { throw new Error('not implemented'); }
  async findByEmployeeId(): Promise<Account | null> { throw new Error('not implemented'); }
  async existsByEmployeeId(): Promise<boolean> { throw new Error('not implemented'); }
  async updatePasswordHash(): Promise<void> { throw new Error('not implemented'); }
  async updateStatus(): Promise<void> { throw new Error('not implemented'); }
  async syncRoleFromEmployee(): Promise<void> { throw new Error('not implemented'); }
  async countActiveByEmployeeIds(): Promise<number> { throw new Error('not implemented'); }
  async updateEmailByCustomerId(): Promise<void> { throw new Error('not implemented'); }

  seedCustomerAccount(record: CustomerLoginRecord): void {
    this.customerLogins.set(record.accountId, record);
    if (record.accountId >= this.nextId) this.nextId = record.accountId + 1;
  }
}

class FakePasswordHasher implements PasswordHasher {
  readonly calls: string[] = [];
  async hash(plainPassword: string): Promise<string> {
    this.calls.push('hash');
    return `hashed:${plainPassword}`;
  }
  async verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    return passwordHash === `hashed:${plainPassword}`;
  }
}

// Transacción en memoria: guarda una copia de los dos repositorios y la restaura si fn tira,
// igual que un rollback. Anidada (customers abre la suya dentro) se suma a la de afuera.
class RollbackTransactionRunner implements TransactionRunner, CustomerTransactionRunner {
  readonly calls: string[] = [];
  private depth = 0;

  constructor(
    private readonly customers: FakeCustomerRepository,
    private readonly accounts: FakeAccountRepository,
  ) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.depth > 0) return await fn();

    this.calls.push('run');
    const customers = new Map(this.customers.items);
    const logins = new Map(this.accounts.customerLogins);
    this.depth++;
    try {
      return await fn();
    } catch (error) {
      this.customers.items = customers;
      this.accounts.customerLogins = logins;
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

describe('AccountsService.registerCustomer (SCRUM-160)', () => {
  let customerRepo: FakeCustomerRepository;
  let accountRepo: FakeAccountRepository;
  let employeeEmails: Set<string>;
  let hasher: FakePasswordHasher;
  let runner: RollbackTransactionRunner;
  let service: AccountsService;

  beforeEach(() => {
    customerRepo = new FakeCustomerRepository();
    accountRepo = new FakeAccountRepository();
    employeeEmails = new Set<string>();
    hasher = new FakePasswordHasher();
    runner = new RollbackTransactionRunner(customerRepo, accountRepo);

    const employeesService = {
      existsByEmail: async (email: string) => employeeEmails.has(email.toLowerCase()),
    } as unknown as EmployeesService;
    const eventEmitter = { emitAsync: jest.fn().mockResolvedValue([]) } as unknown as EventEmitter2;
    const customersService = new CustomersService(customerRepo, employeesService, runner, eventEmitter);

    service = new AccountsService(accountRepo, employeesService, customersService, hasher, runner, eventEmitter);
  });

  const expectNothingCreated = () => {
    expect(customerRepo.items.size).toBe(0);
    expect(accountRepo.customerLogins.size).toBe(0);
  };

  it('crea el cliente y su cuenta CUSTOMER con el email normalizado y la contraseña hasheada', async () => {
    const result = await service.registerCustomer(input());

    expect(result).toEqual({
      customerId: 1,
      email: 'lucia@example.com',
      firstName: 'Lucía',
      lastName: 'Fernández',
    });
    const customer = customerRepo.items.get(1) as Customer;
    expect(customer.getDocumentNumber()).toBe('40123456');
    expect(customer.isActive()).toBe(true);
    expect(accountRepo.createCustomerAccount).toHaveBeenCalledWith({
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

    await service.registerCustomer(input());

    expect(order[0]).toBe('hash');
    expect(order).toContain('run');
  });

  it('acepta teléfono y fecha de nacimiento opcionales', async () => {
    await service.registerCustomer(input({ phone: '1155555555', dateOfBirth: '1998-05-14' }));

    const customer = customerRepo.items.get(1) as Customer;
    expect(customer.getPhone()).toBe('1155555555');
    expect(customer.getDateOfBirth()).toEqual(new Date('1998-05-14'));
  });

  describe('contraseña', () => {
    it('rechaza una contraseña de menos de 8 caracteres y no crea nada', async () => {
      await expect(service.registerCustomer(input({ password: 'corta12' }))).rejects.toThrow(DomainError);
      expectNothingCreated();
    });

    it('rechaza una contraseña de más de 72 bytes (letras con tilde cuentan 2)', async () => {
      await expect(service.registerCustomer(input({ password: 'á'.repeat(40) }))).rejects.toThrow(DomainError);
      expectNothingCreated();
    });

    it('rechaza una contraseña igual al email (normalizado) y no crea nada', async () => {
      await expect(
        service.registerCustomer(input({ email: 'lucia@example.com', password: 'lucia@example.com' })),
      ).rejects.toThrow(BadRequestException);
      expectNothingCreated();
    });
  });

  describe('datos ya registrados (409)', () => {
    it('documento de un cliente activo: dice que el repetido es el documento', async () => {
      customerRepo.seed({ id: 9, documentNumber: '40123456', email: 'otra@example.com', active: true });

      const error = await service.registerCustomer(input()).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({
        message: REGISTRATION_DOCUMENT_TAKEN,
        details: [{ field: 'documentNumber', message: REGISTRATION_DOCUMENT_TAKEN }],
      });
      expect(customerRepo.items.size).toBe(1);
      expect(accountRepo.customerLogins.size).toBe(0);
    });

    it('email de un cliente activo: dice que el repetido es el email', async () => {
      customerRepo.seed({ id: 9, documentNumber: '30111222', email: 'lucia@example.com', active: true });

      const error = await service.registerCustomer(input()).catch((e: unknown) => e);

      expect((error as ConflictException).getResponse()).toMatchObject({
        message: REGISTRATION_EMAIL_TAKEN,
        details: [{ field: 'email', message: REGISTRATION_EMAIL_TAKEN }],
      });
      expect(accountRepo.customerLogins.size).toBe(0);
    });

    it('email de un empleado: 409 por el email', async () => {
      employeeEmails.add('lucia@example.com');

      await expect(service.registerCustomer(input())).rejects.toThrow(REGISTRATION_EMAIL_TAKEN);
      expectNothingCreated();
    });

    it('email de una cuenta de empleado: 409 por el email', async () => {
      accountRepo.employeeAccountEmails.add('lucia@example.com');

      await expect(service.registerCustomer(input())).rejects.toThrow(REGISTRATION_EMAIL_TAKEN);
      expectNothingCreated();
    });

    it('los mensajes sugieren comunicarse con el restaurante', () => {
      for (const message of [REGISTRATION_DOCUMENT_TAKEN, REGISTRATION_EMAIL_TAKEN, REGISTRATION_DATA_TAKEN]) {
        expect(message).toContain('comunicate con el restaurante');
      }
    });
  });

  describe('cliente dado de baja que vuelve (decisión del PO)', () => {
    beforeEach(() => {
      customerRepo.seed({ id: 9, documentNumber: '40123456', email: 'lucia@example.com', active: false });
      accountRepo.seedCustomerAccount({
        accountId: 50,
        customerId: 9,
        email: 'lucia@example.com',
        passwordHash: 'hashed:vieja1234',
        active: true,
      });
    });

    it('se registra como un cliente nuevo y conserva el registro anterior', async () => {
      const result = await service.registerCustomer(input());

      expect(result.customerId).not.toBe(9);
      expect((customerRepo.items.get(9) as Customer).isActive()).toBe(false);
      expect((customerRepo.items.get(result.customerId) as Customer).isActive()).toBe(true);
    });

    it('desactiva la cuenta vieja para liberar el email', async () => {
      const result = await service.registerCustomer(input());

      expect(accountRepo.customerLogins.get(50)?.active).toBe(false);
      const fresh = [...accountRepo.customerLogins.values()].find((r) => r.customerId === result.customerId);
      expect(fresh).toMatchObject({ email: 'lucia@example.com', active: true });
    });

    it('si el registro falla, la cuenta vieja no queda desactivada', async () => {
      accountRepo.createCustomerAccount.mockRejectedValueOnce(new Error('db down'));

      await expect(service.registerCustomer(input())).rejects.toThrow('db down');
      expect(accountRepo.customerLogins.get(50)?.active).toBe(true);
    });
  });

  describe('todo o nada (transacción)', () => {
    it('si falla la creación de la cuenta, no queda el cliente', async () => {
      accountRepo.createCustomerAccount.mockRejectedValueOnce(new Error('db down'));

      await expect(service.registerCustomer(input())).rejects.toThrow('db down');
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

      await expect(service.registerCustomer(input())).rejects.toThrow(REGISTRATION_DATA_TAKEN);
      expect(accountRepo.customerLogins.size).toBe(0);
    });
  });
});
