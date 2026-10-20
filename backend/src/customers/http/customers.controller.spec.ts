import { CustomersController } from './customers.controller.js';
import { CustomersService } from '../application/customers.service.js';
import { Customer } from '../domain/customer.js';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto.js';
import { FindCustomerByDocumentQueryDto } from './dto/find-customer-by-document-query.dto.js';
import { createCapturingAuditService } from '../../audit/testing/capturing-audit-service.js';
import type { AuditEntryInput } from '../../audit/domain/audit-entry.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';

const makeCustomer = (active = true) =>
  Customer.reconstruct({
    id: 1,
    firstName: 'Juan',
    lastName: 'Pérez',
    documentType: 'DNI',
    documentNumber: '12345678',
    email: 'juan@example.com',
    active,
  });

describe('CustomersController', () => {
  let service: {
    list: jest.Mock;
    findByDocument: jest.Mock;
    getStatusHistory: jest.Mock;
    deactivate: jest.Mock;
    activate: jest.Mock;
    findById: jest.Mock;
    createWithAccount: jest.Mock;
    update: jest.Mock;
  };
  let audit: AuditEntryInput[];
  let controller: CustomersController;

  const cashier: CurrentUserData = { accountId: 9, role: 'CASHIER', employeeId: 9 };
  const customer = Customer.reconstruct({
    id: 7,
    firstName: 'Carlos',
    lastName: 'Ruiz',
    documentType: 'DNI',
    documentNumber: '30111222',
    email: 'carlos@mail.com',
    phone: null,
    dateOfBirth: null,
    active: true,
  });

  beforeEach(() => {
    service = {
      list: jest.fn(),
      findByDocument: jest.fn(),
      getStatusHistory: jest.fn(),
      deactivate: jest.fn(),
      activate: jest.fn(),
      findById: jest.fn().mockResolvedValue(customer),
      createWithAccount: jest.fn(),
      update: jest.fn(),
    };
    const capturing = createCapturingAuditService();
    audit = capturing.entries;
    controller = new CustomersController(service as unknown as CustomersService, capturing.service);
  });

  const query = (values: Partial<ListCustomersQueryDto> = {}): ListCustomersQueryDto =>
    Object.assign(new ListCustomersQueryDto(), values);

  describe('alta y edición', () => {
    it('create() audita CUSTOMER_CREATED con origen Caja y sin la contraseña inicial', async () => {
      service.createWithAccount.mockResolvedValue(customer);

      await controller.create(
        {
          firstName: 'Carlos',
          lastName: 'Ruiz',
          documentType: 'DNI',
          documentNumber: '30111222',
          email: 'carlos@mail.com',
        } as never,
        cashier,
      );

      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({
        actor: { type: 'EMPLOYEE', accountId: 9 },
        module: 'CUSTOMERS',
        action: 'CUSTOMER_CREATED',
        description: 'Registró al cliente Carlos Ruiz',
        affectedCustomer: { customerId: 7, name: 'Carlos Ruiz' },
      });
      expect(audit[0].details).toContainEqual({ label: 'Origen', value: 'Caja' });
      expect(JSON.stringify(audit[0].details)).not.toContain('30111222');
    });

    it('create() por el Administrador audita el origen Administración', async () => {
      service.createWithAccount.mockResolvedValue(customer);

      await controller.create({} as never, { accountId: 1, role: 'ADMIN', employeeId: 1 });

      expect(audit[0].details).toContainEqual({ label: 'Origen', value: 'Administración' });
    });

    it('update() audita una fila por campo que cambió', async () => {
      service.update.mockResolvedValue(
        Customer.reconstruct({
          id: 7,
          firstName: 'Carlos',
          lastName: 'Ruiz',
          documentType: 'DNI',
          documentNumber: '30111222',
          email: 'carlos@mail.com',
          phone: '3510000000',
          active: true,
        }),
      );

      await controller.update(7, { phone: '3510000000' } as never, cashier);

      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({
        action: 'CUSTOMER_UPDATED',
        description: 'Editó los datos del cliente Carlos Ruiz',
        details: [{ label: 'Teléfono', value: '— → 3510000000' }],
      });
    });

    it('update() no audita si la edición falla', async () => {
      service.update.mockRejectedValue(new Error('documento en uso'));

      await expect(controller.update(7, {} as never, cashier)).rejects.toThrow('documento en uso');
      expect(audit).toEqual([]);
    });
  });

  describe('baja y reactivación', () => {
    it('deactivate() delega la baja en el servicio con el id recibido', async () => {
      service.deactivate.mockResolvedValue(undefined);

      await expect(controller.deactivate(7, cashier)).resolves.toBeUndefined();
      expect(service.deactivate).toHaveBeenCalledWith(7);
    });

    it('deactivate() audita CUSTOMER_DEACTIVATED con el cliente afectado', async () => {
      service.deactivate.mockResolvedValue(undefined);

      await controller.deactivate(7, cashier);

      expect(audit).toEqual([
        {
          actor: { type: 'EMPLOYEE', accountId: 9 },
          module: 'CUSTOMERS',
          action: 'CUSTOMER_DEACTIVATED',
          description: 'Dio de baja al cliente Carlos Ruiz',
          affectedCustomer: {
            customerId: 7,
            name: 'Carlos Ruiz',
            documentType: 'DNI',
            documentNumber: '30111222',
          },
          details: [{ label: 'Estado', value: 'Activo → Inactivo' }],
        },
      ]);
    });

    it('deactivate() no audita si la baja falla', async () => {
      service.deactivate.mockRejectedValue(new Error('ya está inactivo'));

      await expect(controller.deactivate(7, cashier)).rejects.toThrow('ya está inactivo');
      expect(audit).toEqual([]);
    });

    it('activate() delega la reactivación en el servicio', async () => {
      service.activate.mockResolvedValue(undefined);

      await controller.activate(7);
      expect(service.activate).toHaveBeenCalledWith(7);
    });
  });

  describe('findAll()', () => {
    it('usa page=1 y limit=20 por defecto y no filtra por estado', async () => {
      service.list.mockResolvedValue({ items: [], total: 0 });

      const result = await controller.findAll(query());

      expect(service.list).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        nameContains: undefined,
        active: undefined,
      });
      expect(result).toEqual({ items: [], total: 0, page: 1, limit: 20 });
    });

    it('convierte active="false" a booleano y arma la respuesta', async () => {
      service.list.mockResolvedValue({ items: [makeCustomer(false)], total: 1 });

      const result = await controller.findAll(query({ active: 'false', name: ' juan ' }));

      expect(service.list).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        nameContains: 'juan',
        active: false,
      });
      expect(result.items[0]).toMatchObject({ id: 1, active: false });
    });

    it('convierte active="true" a booleano', async () => {
      service.list.mockResolvedValue({ items: [], total: 0 });

      await controller.findAll(query({ active: 'true' }));

      expect(service.list).toHaveBeenCalledWith(expect.objectContaining({ active: true }));
    });
  });

  describe('findByDocument()', () => {
    it('busca por tipo y número de documento y devuelve el cliente', async () => {
      service.findByDocument.mockResolvedValue(makeCustomer());
      const dto = Object.assign(new FindCustomerByDocumentQueryDto(), { documentNumber: '12.345.678' });

      const result = await controller.findByDocument(dto);

      expect(service.findByDocument).toHaveBeenCalledWith('DNI', '12.345.678');
      expect(result).toMatchObject({ id: 1, documentType: 'DNI', documentNumber: '12345678' });
    });
  });

  describe('statusHistory()', () => {
    it('devuelve el historial con las fechas en formato ISO', async () => {
      const date = new Date('2026-09-20T12:00:00.000Z');
      service.getStatusHistory.mockResolvedValue([{ id: 3, action: 'DEACTIVATED', createdAt: date }]);

      const result = await controller.statusHistory(1);

      expect(service.getStatusHistory).toHaveBeenCalledWith(1);
      expect(result).toEqual([{ id: 3, action: 'DEACTIVATED', createdAt: '2026-09-20T12:00:00.000Z' }]);
    });
  });
});
