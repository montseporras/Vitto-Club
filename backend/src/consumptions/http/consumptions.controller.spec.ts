import { ConsumptionsController } from './consumptions.controller.js';
import { ConsumptionsService } from '../application/consumptions.service.js';
import { Consumption } from '../domain/consumption.js';
import { Customer } from '../../customers/domain/customer.js';
import { CustomersService } from '../../customers/application/customers.service.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';

describe('ConsumptionsController', () => {
  let service: { preview: jest.Mock; register: jest.Mock; anular: jest.Mock; listAll: jest.Mock; getByCode: jest.Mock };
  let customersService: { findById: jest.Mock };
  let controller: ConsumptionsController;

  const customer = Customer.reconstruct({
    id: 101,
    firstName: 'Carolina',
    lastName: 'Fernández',
    documentType: 'DNI',
    documentNumber: '38456123',
    email: 'carolina@example.com',
    active: true,
  });

  const consumption = Consumption.reconstruct({
    id: 141,
    customerId: 101,
    amount: 50000,
    notes: null,
    points: 500,
    bonusPoints: 0,
    configurationVersion: 4,
    baseAmount: 1000,
    pointsAwarded: 10,
    registeredByAccountId: 12,
    registeredByName: 'Ana Pereyra',
    status: 'REGISTERED',
    createdAt: new Date('2026-10-16T18:40:00.000Z'),
  });

  const cashier: CurrentUserData = { accountId: 12, role: 'CASHIER', employeeId: 12 };

  beforeEach(() => {
    service = { preview: jest.fn(), register: jest.fn(), anular: jest.fn(), listAll: jest.fn(), getByCode: jest.fn() };
    customersService = { findById: jest.fn().mockResolvedValue(customer) };
    controller = new ConsumptionsController(
      service as unknown as ConsumptionsService,
      customersService as unknown as CustomersService,
    );
  });

  describe('preview() — CA-21.1', () => {
    it('delega en el servicio con customerId/amount de la query', async () => {
      service.preview.mockResolvedValue({ points: 500 });

      const result = await controller.preview({ customerId: 101, amount: 50000 });

      expect(service.preview).toHaveBeenCalledWith({ customerId: 101, amount: 50000 });
      expect(result).toEqual({ points: 500 });
    });
  });

  describe('register() — CA-21.5', () => {
    it('arma la respuesta con el consumo mapeado y balance/nivel', async () => {
      service.register.mockResolvedValue({
        consumption,
        balanceBefore: 0,
        balanceAfter: 500,
        levelBefore: 'BRONZE',
        levelAfter: 'SILVER',
        levelUp: true,
      });

      const result = await controller.register(
        { customerId: 101, amount: 50000, notes: null },
        cashier,
      );

      expect(service.register).toHaveBeenCalledWith({
        customerId: 101,
        amount: 50000,
        notes: null,
        registeredBy: { accountId: 12, employeeId: 12 },
      });
      expect(result.consumption.code).toBe('C-000141');
      expect(result.consumption.customer).toEqual({
        id: 101,
        firstName: 'Carolina',
        lastName: 'Fernández',
        documentType: 'DNI',
        documentNumber: '38456123',
      });
      expect(result.balanceAfter).toBe(500);
      expect(result.levelUp).toBe(true);
    });
  });

  describe('anular() — CA-22.4 a CA-22.9', () => {
    it('delega en el servicio con el actor del request y arma la respuesta', async () => {
      const voided = Consumption.reconstruct({
        customerId: 101,
        amount: 50000,
        notes: null,
        points: 500,
        bonusPoints: 0,
        configurationVersion: 4,
        baseAmount: 1000,
        pointsAwarded: 10,
        registeredByAccountId: 12,
        registeredByName: 'Ana Pereyra',
        id: 141,
        status: 'VOIDED',
        createdAt: new Date('2026-10-16T18:40:00.000Z'),
        voidedAt: new Date('2026-10-16T20:00:00.000Z'),
        voidedByAccountId: 12,
        voidedByName: 'Ana Pereyra',
        voidedReason: 'motivo válido',
      });
      service.anular.mockResolvedValue({
        consumption: voided,
        balanceBefore: 500,
        balanceAfter: 0,
        negativeBalance: false,
      });

      const result = await controller.anular('C-000141', { reason: 'motivo válido' }, cashier);

      expect(service.anular).toHaveBeenCalledWith({
        code: 'C-000141',
        reason: 'motivo válido',
        actor: { accountId: 12, role: 'CASHIER', employeeId: 12 },
      });
      expect(result.consumption.status).toBe('VOIDED');
      expect(result.negativeBalance).toBe(false);
    });
  });

  const admin: CurrentUserData = { accountId: 999, role: 'ADMIN', employeeId: 1 };

  describe('list() — US-23, CA-23.2/CA-23.3', () => {
    it('delega los filtros en el servicio y arma la página con los totales', async () => {
      const customerSnapshot = {
        id: 101,
        firstName: 'Carolina',
        lastName: 'Fernández',
        documentType: 'DNI',
        documentNumber: '38456123',
      };
      service.listAll.mockResolvedValue({
        items: [{ consumption, customer: customerSnapshot }],
        total: 17,
        page: 1,
        limit: 8,
        totals: { count: 17, amountTotal: 735700, pointsTotal: 7357 },
      });

      const result = await controller.list(
        { fromDate: '2026-10-01', toDate: '2026-10-15', q: 'carolina', status: 'REGISTERED', registeredByAccountId: 12, customerId: 101, page: 1, limit: 8 },
        admin,
      );

      expect(service.listAll).toHaveBeenCalledWith({
        fromDate: '2026-10-01',
        toDate: '2026-10-15',
        q: 'carolina',
        status: 'REGISTERED',
        registeredByAccountId: 12,
        customerId: 101,
        page: 1,
        limit: 8,
      });
      expect(result).toMatchObject({
        total: 17,
        page: 1,
        limit: 8,
        totals: { count: 17, amountTotal: 735700, pointsTotal: 7357 },
      });
      expect(result.items[0].code).toBe('C-000141');
      expect(result.items[0].customer).toEqual(customerSnapshot);
      // Administrador: canVoid = REGISTERED, sin voidableUntil (§3.2.1)
      expect(result.items[0].canVoid).toBe(true);
      expect(result.items[0].voidableUntil).toBeNull();
    });
  });

  describe('detail() — US-23, CA-23.5', () => {
    it('devuelve el consumo completo con los datos del cliente', async () => {
      service.getByCode.mockResolvedValue(consumption);

      const result = await controller.detail('C-000141', admin);

      expect(service.getByCode).toHaveBeenCalledWith('C-000141');
      expect(customersService.findById).toHaveBeenCalledWith(101);
      expect(result.code).toBe('C-000141');
      expect(result.equivalence).toEqual({ baseAmount: 1000, pointsAwarded: 10, configurationVersion: 4 });
      expect(result.registeredBy).toEqual({ accountId: 12, name: 'Ana Pereyra' });
      expect(result.canVoid).toBe(true);
    });
  });
});
