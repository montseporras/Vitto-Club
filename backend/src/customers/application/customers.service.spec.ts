import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmployeesService } from '../../employees/application/employees.service.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import { CUSTOMER_EMAIL_CHANGED } from '../../shared/events/domain-events.js';
import { Customer, DocumentType } from '../domain/customer.js';
import { CustomerStatusAction, CustomerStatusChange } from '../domain/customer-status-change.js';
import {
  CustomerRepository,
  CustomerListParams,
  CustomerListResult,
} from '../domain/port/customer.repository.js';
// Doble liviano: CustomersService solo depende de la forma estructural
// { existsByEmail(email) }. Ya no hay ciclo Customers<->Employees (ver customers.service.ts:
// dirección única Customers -> Employees), así que el parámetro acepta la clase concreta
// EmployeesService — este fake se castea para no tener que instanciar sus dependencias
// reales (employeesRepository, transactionRunner, eventEmitter), que esta suite no ejercita.
class FakeEmployeesService {
  readonly emails = new Set<string>();
  async existsByEmail(email: string): Promise<boolean> {
    return this.emails.has(email.toLowerCase());
  }
}

// Repositorio en memoria solo para los tests (no toca la base de datos)
class FakeCustomerRepository implements CustomerRepository {
  private readonly items = new Map<number, Customer>();
  private readonly history: (CustomerStatusChange & { customerId: number })[] = [];
  private nextId = 1;
  private nextHistoryId = 1;
  readonly update_ = jest.fn();
  readonly list_ = jest.fn();

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
      deactivatedAt: customer.getDeactivatedAt(),
      createdAt: customer.getCreatedAt(),
      updatedAt: customer.getUpdatedAt(),
    });
    this.items.set(id, saved);
    return saved;
  }
  async findById(id: number): Promise<Customer | null> {
    return this.items.get(id) ?? null;
  }
  // Igual que el repositorio real: el activo primero y, si no hay, el inactivo más reciente
  async findByDocument(type: DocumentType, number: string): Promise<Customer | null> {
    const matches = [...this.items.values()]
      .filter((c) => c.getDocumentType() === type && c.getDocumentNumber() === number)
      .sort((a, b) => Number(b.isActive()) - Number(a.isActive()) || (b.getId() as number) - (a.getId() as number));
    return matches[0] ?? null;
  }
  async findAll(): Promise<Customer[]> {
    return [...this.items.values()];
  }
  async update(customer: Customer): Promise<void> {
    this.update_(customer);
    this.items.set(customer.getId() as number, customer);
  }
  async updateStatus(customer: Customer, action: CustomerStatusAction): Promise<void> {
    this.items.set(customer.getId() as number, customer);
    this.history.push({
      id: this.nextHistoryId++,
      customerId: customer.getId() as number,
      action,
      createdAt: new Date(),
    });
  }
  async findStatusHistory(customerId: number): Promise<CustomerStatusChange[]> {
    return this.history
      .filter((h) => h.customerId === customerId)
      .map(({ id, action, createdAt }) => ({ id, action, createdAt }))
      .reverse();
  }
  async existsByDocument(type: DocumentType, number: string, excludeId?: number): Promise<boolean> {
    return [...this.items.values()].some(
      (c) =>
        c.isActive() && c.getDocumentType() === type && c.getDocumentNumber() === number && c.getId() !== excludeId,
    );
  }
  async existsByEmail(email: string, options: { onlyActive?: boolean } = {}): Promise<boolean> {
    return [...this.items.values()].some(
      (c) => (!options.onlyActive || c.isActive()) && c.getEmail().toLowerCase() === email.toLowerCase(),
    );
  }
  async list(params: CustomerListParams): Promise<CustomerListResult> {
    this.list_(params);
    return { items: [...this.items.values()], total: this.items.size };
  }
}

// Ejecuta la función tal cual: los tests no necesitan una transacción real
class PassthroughTransactionRunner implements TransactionRunner {
  async run<T>(fn: () => Promise<T>): Promise<T> {
    return await fn();
  }
}

describe('CustomersService', () => {
  let repo: FakeCustomerRepository;
  let employeesService: FakeEmployeesService;
  let emitAsync: jest.Mock;
  let service: CustomersService;
  let id: number;

  // Otro cliente, con datos propios salvo lo que se pise
  const otherCustomer = (overrides: Partial<Parameters<CustomersService['create']>[0]> = {}) =>
    service.create({
      firstName: 'Otro',
      lastName: 'Cliente',
      documentType: 'DNI',
      documentNumber: '87654321',
      email: 'otro@example.com',
      ...overrides,
    });

  beforeEach(async () => {
    repo = new FakeCustomerRepository();
    employeesService = new FakeEmployeesService();
    emitAsync = jest.fn().mockResolvedValue([]);
    service = new CustomersService(
      repo,
      employeesService as unknown as EmployeesService,
      new PassthroughTransactionRunner(),
      { emitAsync } as unknown as EventEmitter2,
    );
    const created = await service.create({
      firstName: 'Juan',
      lastName: 'Pérez',
      documentType: 'DNI',
      documentNumber: '12345678',
      email: 'juan@example.com',
      phone: '1155555555',
    });
    id = created.getId() as number;
  });

  describe('deactivate()', () => {
    it('cambia el estado a inactivo y registra la fecha de baja', async () => {
      await service.deactivate(id);

      const customer = await service.findById(id);
      expect(customer.isActive()).toBe(false);
      expect(customer.getDeactivatedAt()).toBeInstanceOf(Date);
    });

    it('conserva el registro y todos sus datos (baja lógica, no física)', async () => {
      await service.deactivate(id);

      const customer = await service.findById(id);
      expect(customer.getFirstName()).toBe('Juan');
      expect(customer.getDocumentNumber()).toBe('12345678');
      expect(customer.getEmail()).toBe('juan@example.com');
      expect(customer.getPhone()).toBe('1155555555');
      expect(await repo.findAll()).toHaveLength(1);
    });

    it('lanza 409 si el cliente ya está inactivo', async () => {
      await service.deactivate(id);

      await expect(service.deactivate(id)).rejects.toThrow(ConflictException);
      await expect(service.deactivate(id)).rejects.toThrow('already inactive');
    });

    it('lanza 404 si el cliente no existe', async () => {
      await expect(service.deactivate(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('activate()', () => {
    it('reactiva un cliente inactivo y limpia la fecha de baja', async () => {
      await service.deactivate(id);
      await service.activate(id);

      const customer = await service.findById(id);
      expect(customer.isActive()).toBe(true);
      expect(customer.getDeactivatedAt()).toBeNull();
    });

    it('lanza 409 si el cliente ya está activo', async () => {
      await expect(service.activate(id)).rejects.toThrow(ConflictException);
      await expect(service.activate(id)).rejects.toThrow('already active');
    });
  });

  describe('historial de bajas y reactivaciones', () => {
    it('registra cada baja y reactivación, la más reciente primero', async () => {
      await service.deactivate(id);
      await service.activate(id);
      await service.deactivate(id);

      const history = await service.getStatusHistory(id);
      expect(history.map((h) => h.action)).toEqual(['DEACTIVATED', 'ACTIVATED', 'DEACTIVATED']);
    });

    it('conserva las bajas anteriores aunque el cliente se reactive', async () => {
      await service.deactivate(id);
      await service.activate(id);

      const history = await service.getStatusHistory(id);
      expect(history).toHaveLength(2);
      expect((await service.findById(id)).getDeactivatedAt()).toBeNull();
    });

    it('un cliente sin cambios de estado tiene el historial vacío', async () => {
      expect(await service.getStatusHistory(id)).toEqual([]);
    });

    it('lanza 404 si el cliente no existe', async () => {
      await expect(service.getStatusHistory(999)).rejects.toThrow(NotFoundException);
    });

    it('un intento de baja repetida (409) no agrega registros al historial', async () => {
      await service.deactivate(id);
      await expect(service.deactivate(id)).rejects.toThrow(ConflictException);

      expect(await service.getStatusHistory(id)).toHaveLength(1);
    });
  });

  describe('findByDocument()', () => {
    it('identifica al cliente por su documento', async () => {
      const customer = await service.findByDocument('DNI', '12345678');
      expect(customer.getId()).toBe(id);
    });

    it('normaliza el documento antes de buscar (puntos, espacios, guiones)', async () => {
      const customer = await service.findByDocument('DNI', '12.345.678');
      expect(customer.getId()).toBe(id);
    });

    it('lanza 404 si no existe un cliente con ese documento', async () => {
      await expect(service.findByDocument('DNI', '99999999')).rejects.toThrow(NotFoundException);
    });

    it('distingue el tipo de documento', async () => {
      await expect(service.findByDocument('PASSPORT', '12345678')).rejects.toThrow(NotFoundException);
    });

    it('también encuentra a un cliente inactivo (la caja decide qué hacer)', async () => {
      await service.deactivate(id);
      const customer = await service.findByDocument('DNI', '12345678');
      expect(customer.isActive()).toBe(false);
    });

    it('si hay una baja anterior y un cliente activo con el mismo documento, devuelve el activo', async () => {
      await service.deactivate(id);
      const current = await otherCustomer({ documentNumber: '12345678' });

      const customer = await service.findByDocument('DNI', '12345678');
      expect(customer.getId()).toBe(current.getId());
      expect(customer.isActive()).toBe(true);
    });
  });

  describe('update(): evento customer.email-changed', () => {
    it('lo publica con el email nuevo normalizado, después de guardar', async () => {
      const order: string[] = [];
      repo.update_.mockImplementation(() => order.push('update'));
      emitAsync.mockImplementation(async () => {
        order.push('emit');
        return [];
      });

      await service.update(id, { email: ' Nuevo@Example.com ' });

      expect(emitAsync).toHaveBeenCalledWith(CUSTOMER_EMAIL_CHANGED, {
        customerId: id,
        email: 'nuevo@example.com',
      });
      expect(order).toEqual(['update', 'emit']);
    });

    it('no lo publica si el email no cambia (aunque cambien mayúsculas o espacios)', async () => {
      await service.update(id, { email: ' JUAN@example.com', firstName: 'Juan Carlos' });

      expect(emitAsync).not.toHaveBeenCalled();
    });

    it('no lo publica si se modifican otros datos', async () => {
      await service.update(id, { phone: '1144444444' });

      expect(emitAsync).not.toHaveBeenCalled();
    });

    it('no lo publica si la modificación se rechaza (email de otro cliente activo)', async () => {
      await otherCustomer();

      await expect(service.update(id, { email: 'otro@example.com' })).rejects.toThrow(ConflictException);
      expect(emitAsync).not.toHaveBeenCalled();
    });

    it('si accounts rechaza el email (ya lo usa otra cuenta), el error llega a quien llamó', async () => {
      emitAsync.mockRejectedValueOnce(new ConflictException('Email "x" is already used by another account'));

      await expect(service.update(id, { email: 'nuevo@example.com' })).rejects.toThrow(
        'already used by another account',
      );
    });
  });

  describe('update()', () => {
    it('lanza 400 si no se envía ningún campo', async () => {
      await expect(service.update(id, {})).rejects.toThrow(BadRequestException);
      await expect(service.update(id, { firstName: undefined })).rejects.toThrow(BadRequestException);
    });

    it('no permite modificar un cliente inactivo', async () => {
      await service.deactivate(id);

      await expect(service.update(id, { phone: '1144444444' })).rejects.toThrow(ConflictException);
      const customer = await service.findById(id);
      expect(customer.getPhone()).toBe('1155555555');
    });

    it('permite borrar el teléfono con null', async () => {
      const customer = await service.update(id, { phone: null });
      expect(customer.getPhone()).toBeNull();
    });

    it('lanza 409 si el nuevo email ya lo usa otro cliente', async () => {
      await otherCustomer();

      await expect(service.update(id, { email: 'otro@example.com' })).rejects.toThrow(ConflictException);
      expect((await service.findById(id)).getEmail()).toBe('juan@example.com');
    });

    it('compara el email normalizado (mayúsculas y espacios)', async () => {
      await otherCustomer();

      await expect(service.update(id, { email: '  OTRO@Example.com ' })).rejects.toThrow(ConflictException);
    });

    it('permite usar el email de un cliente dado de baja', async () => {
      const other = await otherCustomer();
      await service.deactivate(other.getId() as number);

      const customer = await service.update(id, { email: 'otro@example.com' });
      expect(customer.getEmail()).toBe('otro@example.com');
    });

    it('permite usar el documento de un cliente dado de baja', async () => {
      const other = await otherCustomer();
      await service.deactivate(other.getId() as number);

      const customer = await service.update(id, { documentNumber: '87654321' });
      expect(customer.getDocumentNumber()).toBe('87654321');
    });

    it('permite reenviar su propio email, aunque cambien mayúsculas o espacios', async () => {
      const customer = await service.update(id, { email: ' JUAN@example.com', firstName: 'Juan Carlos' });
      expect(customer.getFirstName()).toBe('Juan Carlos');
      expect(customer.getEmail()).toBe('juan@example.com');
    });

    it('lanza 409 si el nuevo documento ya lo usa otro cliente', async () => {
      await otherCustomer();

      await expect(service.update(id, { documentNumber: '87654321' })).rejects.toThrow(ConflictException);
    });

    // Nuevo (Customers -> Employees también al editar, no solo al crear): cambiar el
    // email de un Customer a uno que ya es de un Employee debe rechazarse igual.
    it('lanza 409 si se cambia el email a uno ya registrado como employee', async () => {
      employeesService.emails.add('empleado@vitto.club');

      await expect(service.update(id, { email: 'empleado@vitto.club' })).rejects.toThrow(
        ConflictException,
      );
      const customer = await service.findById(id);
      expect(customer.getEmail()).not.toBe('empleado@vitto.club');
    });

    it('normaliza el email antes de chequearlo contra employees', async () => {
      employeesService.emails.add('empleado@vitto.club');

      await expect(
        service.update(id, { email: '  Empleado@Vitto.Club  ' }),
      ).rejects.toThrow(ConflictException);
    });

    it('permite cambiar el email si no está registrado como employee', async () => {
      employeesService.emails.add('otro.distinto@vitto.club');

      const customer = await service.update(id, { email: 'nuevo.email@example.com' });

      expect(customer.getEmail()).toBe('nuevo.email@example.com');
    });
  });

  describe('create()', () => {
    it('lanza 409 si otro cliente activo ya tiene el documento', async () => {
      await expect(otherCustomer({ documentNumber: '12.345.678' })).rejects.toThrow(ConflictException);
      await expect(otherCustomer({ documentNumber: '12.345.678' })).rejects.toThrow(/DNI "12345678"/);
    });

    it('un cliente dado de baja libera su documento y su email: se crea un cliente nuevo', async () => {
      await service.deactivate(id);

      const customer = await otherCustomer({ documentNumber: '12.345.678', email: 'juan@example.com' });

      expect(customer.getId()).not.toBe(id);
      expect(customer.isActive()).toBe(true);
      // El registro dado de baja se conserva tal cual
      const old = await service.findById(id);
      expect(old.isActive()).toBe(false);
      expect(old.getDocumentNumber()).toBe('12345678');
    });

    it('lanza 409 si otro cliente ya tiene el email (normalizado)', async () => {
      await expect(otherCustomer({ email: ' JUAN@example.com' })).rejects.toThrow(ConflictException);
      await expect(otherCustomer({ email: ' JUAN@example.com' })).rejects.toThrow(/email "juan@example.com"/);
    });

    it('permite dar de alta otro cliente con el email de uno dado de baja', async () => {
      await service.deactivate(id);

      const customer = await otherCustomer({ email: 'juan@example.com' });
      expect(customer.getEmail()).toBe('juan@example.com');
    });

    it('el mismo número con otro tipo de documento no es un duplicado', async () => {
      const customer = await otherCustomer({ documentType: 'PASSPORT', documentNumber: '12345678' });
      expect(customer.getId()).not.toBeNull();
    });

    // Escenario B (unicidad global de email): existe un Employee con ese email -> se
    // rechaza crear un Customer con el mismo email.
    it('lanza 409 si el email ya está registrado como employee', async () => {
      employeesService.emails.add('empleado@vitto.club');

      await expect(
        service.create({
          firstName: 'Otro',
          lastName: 'Cliente',
          documentType: 'DNI',
          documentNumber: '87654321',
          email: 'empleado@vitto.club',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('permite crear el cliente si el email no está en uso por ningún employee', async () => {
      employeesService.emails.add('otro.distinto@vitto.club');

      const customer = await service.create({
        firstName: 'Otro',
        lastName: 'Cliente',
        documentType: 'DNI',
        documentNumber: '87654321',
        email: 'nuevo@example.com',
      });

      expect(customer.getId()).not.toBeNull();
    });
  });

  describe('list()', () => {
    it('pasa los filtros al repositorio', async () => {
      await service.list({ page: 1, limit: 10, active: true, nameContains: 'juan' });
      expect(repo.list_).toHaveBeenCalledWith({ page: 1, limit: 10, active: true, nameContains: 'juan' });
    });

    it('lanza 400 si page o limit no son positivos', async () => {
      await expect(service.list({ page: 0, limit: 10 })).rejects.toThrow(BadRequestException);
    });
  });
});
