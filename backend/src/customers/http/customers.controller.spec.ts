import { CustomersController } from './customers.controller.js';
import { CustomersService } from '../application/customers.service.js';
import { Customer } from '../domain/customer.js';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto.js';
import { FindCustomerByDocumentQueryDto } from './dto/find-customer-by-document-query.dto.js';

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
  };
  let audit: { capture: jest.Mock };
  let controller: CustomersController;
  const actor = { accountId: 1, role: 'ADMIN' as const, employeeId: 1 };

  beforeEach(() => {
    service = {
      list: jest.fn(),
      findByDocument: jest.fn(),
      getStatusHistory: jest.fn(),
      deactivate: jest.fn(),
      activate: jest.fn(),
      findById: jest.fn(),
    };
    audit = {
      capture: jest.fn().mockImplementation(async (operation, createEntry) => {
        const result = await operation();
        createEntry(result);
        return result;
      }),
    };
    controller = new CustomersController(
      service as unknown as CustomersService,
      audit as never,
    );
  });

  const query = (
    values: Partial<ListCustomersQueryDto> = {},
  ): ListCustomersQueryDto =>
    Object.assign(new ListCustomersQueryDto(), values);

  describe('baja y reactivación', () => {
    it('deactivate() delega la baja en el servicio con el id recibido', async () => {
      service.deactivate.mockResolvedValue(undefined);
      service.findById.mockResolvedValue(makeCustomer(false));

      await expect(controller.deactivate(7, actor)).resolves.toBeUndefined();
      expect(service.deactivate).toHaveBeenCalledWith(7);
      const makeEntry = audit.capture.mock.calls[0][1];
      expect(makeEntry(makeCustomer(false))).toMatchObject({
        actorAccountId: actor.accountId,
        action: 'Baja lógica de cliente',
        documentType: 'DNI',
        documentNumber: '12345678',
      });
    });

    it('activate() delega la reactivación en el servicio', async () => {
      service.activate.mockResolvedValue(undefined);
      service.findById.mockResolvedValue(makeCustomer());

      await controller.activate(7, actor);
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
      service.list.mockResolvedValue({
        items: [makeCustomer(false)],
        total: 1,
      });

      const result = await controller.findAll(
        query({ active: 'false', name: ' juan ' }),
      );

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

      expect(service.list).toHaveBeenCalledWith(
        expect.objectContaining({ active: true }),
      );
    });
  });

  describe('findByDocument()', () => {
    it('busca por tipo y número de documento y devuelve el cliente', async () => {
      service.findByDocument.mockResolvedValue(makeCustomer());
      const dto = Object.assign(new FindCustomerByDocumentQueryDto(), {
        documentNumber: '12.345.678',
      });

      const result = await controller.findByDocument(dto);

      expect(service.findByDocument).toHaveBeenCalledWith('DNI', '12.345.678');
      expect(result).toMatchObject({
        id: 1,
        documentType: 'DNI',
        documentNumber: '12345678',
      });
    });
  });

  describe('statusHistory()', () => {
    it('devuelve el historial con las fechas en formato ISO', async () => {
      const date = new Date('2026-09-20T12:00:00.000Z');
      service.getStatusHistory.mockResolvedValue([
        { id: 3, action: 'DEACTIVATED', createdAt: date },
      ]);

      const result = await controller.statusHistory(1);

      expect(service.getStatusHistory).toHaveBeenCalledWith(1);
      expect(result).toEqual([
        { id: 3, action: 'DEACTIVATED', createdAt: '2026-09-20T12:00:00.000Z' },
      ]);
    });
  });
});
