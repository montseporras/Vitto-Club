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
import { createCapturingAuditService } from '../../audit/testing/capturing-audit-service.js';
import type { CustomerPointsAdjustmentService } from '../application/customer-points-adjustment.service.js';
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
    findById: jest.Mock;
    createWithAccount: jest.Mock;
    update: jest.Mock;
  };
  let pointsService: { getSummary: jest.Mock };
  let audit: AuditEntryInput[];
  let controller: CustomersController;
  let adjustment: { adjust: jest.Mock };

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
      findById: jest.fn().mockResolvedValue(customer),
      createWithAccount: jest.fn(),
      update: jest.fn(),
    };
    pointsService = { getSummary: jest.fn() };
    const capturing = createCapturingAuditService();
    audit = capturing.entries;
    adjustment = { adjust: jest.fn() };
    controller = new CustomersController(
      service as unknown as CustomersService,
      capturing.service,
      pointsService as unknown as CustomerPointsService,
      adjustment as unknown as CustomerPointsAdjustmentService,
    );
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

    // CA-CLI.4: el rol de quien edita llega al servicio y el motivo queda como última fila
    it('update() le pasa el rol al servicio y audita el motivo al final', async () => {
      service.update.mockResolvedValue(
        Customer.reconstruct({
          id: 7,
          firstName: 'Carlos',
          lastName: 'Ruiz',
          documentType: 'DNI',
          documentNumber: '30111223',
          email: 'carlos@mail.com',
          phone: null,
          active: true,
        }),
      );
      const admin: CurrentUserData = { accountId: 1, role: 'ADMIN', employeeId: 1 };
      const dto = { documentNumber: '30111223', reason: 'Error de carga' };

      await controller.update(7, dto as never, admin);

      expect(service.update).toHaveBeenCalledWith(7, dto, 'ADMIN');
      expect(audit[0].details).toEqual([
        { label: 'Documento', value: 'DNI 30111222 → DNI 30111223' },
        { label: 'Motivo', value: 'Error de carga' },
      ]);
    });

    it('update() no audita si la edición falla', async () => {
      service.update.mockRejectedValue(new Error('documento en uso'));

      await expect(controller.update(7, {} as never, cashier)).rejects.toThrow('documento en uso');
      expect(audit).toEqual([]);
    });
  });

  describe('ajuste de puntos (US-24)', () => {
    const admin: CurrentUserData = { accountId: 19, role: 'ADMIN', employeeId: 9 };

    it('ajusta con quién ajusta sacado del token, responde §3.5.1 y audita POINTS_ADJUSTED', async () => {
      adjustment.adjust.mockResolvedValue({
        customer,
        balanceBefore: -350,
        balanceAfter: 0,
        movement: {
          id: 88,
          createdAt: new Date('2026-10-16T18:12:00.000Z'),
          points: 350,
          balanceAfter: 0,
          reason: 'Regularización por anulación de consumo',
          performedBy: { accountId: 19, name: 'Valeria Vitto' },
        },
      });

      const response = await controller.adjustPoints(
        7,
        { direction: 'ADD', points: 350, reason: 'Regularización por anulación de consumo' },
        admin,
      );

      expect(adjustment.adjust).toHaveBeenCalledWith({
        customerId: 7,
        direction: 'ADD',
        points: 350,
        reason: 'Regularización por anulación de consumo',
        performedBy: { accountId: 19, employeeId: 9 },
      });
      expect(response).toEqual({
        movement: {
          id: 88,
          createdAt: '2026-10-16T18:12:00.000Z',
          type: 'MANUAL_ADJUSTMENT',
          points: 350,
          balanceAfter: 0,
          description: 'Ajuste: Regularización por anulación de consumo',
          reason: 'Regularización por anulación de consumo',
          performedBy: { actorType: 'EMPLOYEE', accountId: 19, name: 'Valeria Vitto' },
        },
        balanceBefore: -350,
        balanceAfter: 0,
      });
      expect(audit).toEqual([
        expect.objectContaining({
          actor: { type: 'EMPLOYEE', accountId: 19 },
          module: 'POINTS',
          action: 'POINTS_ADJUSTED',
          description: 'Ajustó puntos de Carlos Ruiz',
          details: [
            { label: 'Cantidad', value: '+350 pts' },
            { label: 'Saldo resultante', value: '0 pts' },
            { label: 'Motivo', value: 'Regularización por anulación de consumo' },
          ],
        }),
      ]);
    });

    it('si el ajuste falla, no audita', async () => {
      adjustment.adjust.mockRejectedValue(new Error('No se puede restar más que el saldo disponible.'));

      await expect(
        controller.adjustPoints(7, { direction: 'SUBTRACT', points: 9999, reason: 'Corrección' }, admin),
      ).rejects.toThrow();
      expect(audit).toEqual([]);
    });
  });

  describe('baja', () => {
    it('deactivate() delega la baja en el servicio con el id recibido', async () => {
      service.deactivate.mockResolvedValue(0);

      await expect(controller.deactivate(7, cashier)).resolves.toBeUndefined();
      expect(service.deactivate).toHaveBeenCalledWith(7);
    });

    it('deactivate() audita CUSTOMER_DEACTIVATED con el cliente afectado y el saldo perdido', async () => {
      service.deactivate.mockResolvedValue(150);

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
          details: [
            { label: 'Estado', value: 'Activo → Inactivo' },
            { label: 'Saldo perdido', value: '150 pts' },
          ],
        },
      ]);
    });

    it('deactivate() no audita si la baja falla', async () => {
      service.deactivate.mockRejectedValue(new Error('ya está inactivo'));

      await expect(controller.deactivate(7, cashier)).rejects.toThrow('ya está inactivo');
      expect(audit).toEqual([]);
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
        search: undefined,
        level: undefined,
        sort: undefined,
        active: undefined,
      });
      expect(result).toEqual({ items: [], total: 0, page: 1, limit: 20 });
    });

    it('convierte active="false" a booleano y arma la respuesta', async () => {
      service.list.mockResolvedValue({
        items: [{ customer: makeCustomer(false), balance: 0, lifetimePoints: 0, level: 'BRONZE' }],
        total: 1,
      });

      const result = await controller.findAll(query({ active: 'false', name: ' juan ' }));

      expect(service.list).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        nameContains: 'juan',
        search: undefined,
        level: undefined,
        sort: undefined,
        active: false,
      });
      expect(result.items[0]).toMatchObject({ id: 1, active: false });
    });

    // CA-CLI.1: q, level y sort llegan al servicio; cada ítem suma saldo, acumulados y nivel
    it('pasa q, level y sort y agrega balance, lifetimePoints y level a cada ítem', async () => {
      service.list.mockResolvedValue({
        items: [{ customer: makeCustomer(), balance: -20, lifetimePoints: 350, level: 'SILVER' }],
        total: 1,
      });

      const result = await controller.findAll(
        query({ active: 'true', q: ' 30.111 ', level: 'SILVER', sort: 'lastName' }),
      );

      expect(service.list).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        nameContains: undefined,
        search: '30.111',
        level: 'SILVER',
        sort: 'lastName',
        active: true,
      });
      expect(result.items[0]).toMatchObject({
        id: 1,
        firstName: 'Juan',
        balance: -20,
        lifetimePoints: 350,
        level: 'SILVER',
      });
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
