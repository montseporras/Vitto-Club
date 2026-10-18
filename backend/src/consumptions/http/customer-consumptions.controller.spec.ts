import { CustomerConsumptionsController } from './customer-consumptions.controller.js';
import { ConsumptionsService } from '../application/consumptions.service.js';
import { Consumption } from '../domain/consumption.js';
import { Customer } from '../../customers/domain/customer.js';
import { CustomersService } from '../../customers/application/customers.service.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';

describe('CustomerConsumptionsController', () => {
  let service: { listByCustomer: jest.Mock };
  let customersService: { findById: jest.Mock };
  let controller: CustomerConsumptionsController;

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

  const admin: CurrentUserData = { accountId: 999, role: 'ADMIN', employeeId: 1 };
  const cashier: CurrentUserData = { accountId: 12, role: 'CASHIER', employeeId: 12 };

  beforeEach(() => {
    service = { listByCustomer: jest.fn() };
    customersService = { findById: jest.fn().mockResolvedValue(customer) };
    controller = new CustomerConsumptionsController(
      service as unknown as ConsumptionsService,
      customersService as unknown as CustomersService,
    );
  });

  it('delega en el servicio con el viewer del request y mapea los items', async () => {
    service.listByCustomer.mockResolvedValue({ items: [consumption], total: 1, page: 1, limit: 20 });

    const result = await controller.listByCustomer(
      101,
      { page: 1, limit: 20 },
      admin,
    );

    expect(service.listByCustomer).toHaveBeenCalledWith({
      customerId: 101,
      viewer: { role: 'ADMIN', accountId: 999 },
      status: undefined,
      last24h: undefined,
      page: 1,
      limit: 20,
    });
    expect(result.total).toBe(1);
    expect(result.items[0].code).toBe('C-000141');
    expect(result.items[0].canVoid).toBe(true); // Administrador, REGISTERED
  });

  it('traduce last24h de string a boolean antes de llamar al servicio', async () => {
    service.listByCustomer.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });

    await controller.listByCustomer(101, { last24h: 'true', page: 1, limit: 20 }, cashier);

    expect(service.listByCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ last24h: true }),
    );
  });

  it('canVoid para un Cajero ajeno es false', async () => {
    service.listByCustomer.mockResolvedValue({ items: [consumption], total: 1, page: 1, limit: 20 });

    const result = await controller.listByCustomer(101, { page: 1, limit: 20 }, {
      accountId: 999,
      role: 'CASHIER',
      employeeId: 2,
    });

    expect(result.items[0].canVoid).toBe(false);
  });
});
