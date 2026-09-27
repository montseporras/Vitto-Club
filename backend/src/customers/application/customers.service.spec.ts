import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service.js';
import { Customer, DocumentType } from '../domain/customer.js';
import { CustomerStatusAction, CustomerStatusChange } from '../domain/customer-status-change.js';
import {
  CustomerRepository,
  CustomerListParams,
  CustomerListResult,
} from '../domain/port/customer.repository.js';

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
  async findByDocument(type: DocumentType, number: string): Promise<Customer | null> {
    return (
      [...this.items.values()].find(
        (c) => c.getDocumentType() === type && c.getDocumentNumber() === number,
      ) ?? null
    );
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
      (c) => c.getDocumentType() === type && c.getDocumentNumber() === number && c.getId() !== excludeId,
    );
  }
  async list(params: CustomerListParams): Promise<CustomerListResult> {
    this.list_(params);
    return { items: [...this.items.values()], total: this.items.size };
  }
}

describe('CustomersService', () => {
  let repo: FakeCustomerRepository;
  let service: CustomersService;
  let id: number;

  beforeEach(async () => {
    repo = new FakeCustomerRepository();
    service = new CustomersService(repo);
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
  });

  describe('create()', () => {
    it('no permite dar de alta otro cliente con el documento de uno inactivo y sugiere reactivarlo', async () => {
      await service.deactivate(id);

      await expect(
        service.create({
          firstName: 'Otro',
          lastName: 'Cliente',
          documentType: 'DNI',
          documentNumber: '12.345.678',
          email: 'otro@example.com',
        }),
      ).rejects.toThrow(/reactivate it/);
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
