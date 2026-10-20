import { ConsumptionsController } from './consumptions.controller.js';
import { ConsumptionsService } from '../application/consumptions.service.js';
import { Consumption } from '../domain/consumption.js';
import { Customer } from '../../customers/domain/customer.js';
import { CustomersService } from '../../customers/application/customers.service.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';

describe('ConsumptionsController', () => {
  let service: { preview: jest.Mock; register: jest.Mock; anular: jest.Mock };
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
    service = { preview: jest.fn(), register: jest.fn(), anular: jest.fn() };
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
});
