import { CustomersController } from './customers.controller.js';
import { CustomersService } from '../application/customers.service.js';
import { Customer } from '../domain/customer.js';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto.js';
import { FindCustomerByDocumentQueryDto } from './dto/find-customer-by-document-query.dto.js';
import { CustomerPointsService } from '../application/customer-points.service.js';
import type { PointsSummary } from '../../points/application/points.service.js';

const pointsSummary: PointsSummary = {
  customerId: 1,
  balance: 450,
  negativeBalance: false,
  lifetimePoints: 450,
  level: {
    current: 'SILVER',
    next: 'GOLD',
    currentMinPoints: 300,
    nextMinPoints: 800,
    pointsToNext: 350,
    progressPercent: 30,
  },
  nextExpirations: [{ points: 200, expiresAt: '2026-11-30' }],
};

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
  };
  let pointsService: { getSummary: jest.Mock };
  let controller: CustomersController;

  beforeEach(() => {
    service = {
      list: jest.fn(),
      findByDocument: jest.fn(),
      getStatusHistory: jest.fn(),
      deactivate: jest.fn(),
      activate: jest.fn(),
    };
    pointsService = { getSummary: jest.fn() };
    controller = new CustomersController(
      service as unknown as CustomersService,
      pointsService as unknown as CustomerPointsService,
    );
  });

  const query = (values: Partial<ListCustomersQueryDto> = {}): ListCustomersQueryDto =>
    Object.assign(new ListCustomersQueryDto(), values);

  describe('baja y reactivación', () => {
    it('deactivate() delega la baja en el servicio con el id recibido', async () => {
      service.deactivate.mockResolvedValue(undefined);

      await expect(controller.deactivate(7)).resolves.toBeUndefined();
      expect(service.deactivate).toHaveBeenCalledWith(7);
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

  describe('puntos del cliente (US-46 / US-19)', () => {
    it('points() devuelve la forma de §3.4.1 para el id recibido', async () => {
      pointsService.getSummary.mockResolvedValue(pointsSummary);

      const result = await controller.points(1);

      expect(pointsService.getSummary).toHaveBeenCalledWith(1);
      expect(result).toEqual(pointsSummary);
    });

    it('myPoints() usa el customerId del token', async () => {
      pointsService.getSummary.mockResolvedValue(pointsSummary);

      const result = await controller.myPoints({ accountId: 9, role: 'CUSTOMER', customerId: 1 });

      expect(pointsService.getSummary).toHaveBeenCalledWith(1);
      expect(result).toEqual(pointsSummary);
    });

    it('myPoints() rechaza con 403 FORBIDDEN un token sin customerId', async () => {
      await expect(controller.myPoints({ accountId: 9, role: 'CUSTOMER' })).rejects.toMatchObject({
        status: 403,
        response: expect.objectContaining({ code: 'FORBIDDEN' }),
      });
      expect(pointsService.getSummary).not.toHaveBeenCalled();
    });
  });
});
