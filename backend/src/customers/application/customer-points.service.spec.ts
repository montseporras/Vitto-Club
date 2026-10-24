import { NotFoundException } from '@nestjs/common';
import { CustomerPointsService } from './customer-points.service.js';
import { CustomersService } from './customers.service.js';
import { PointsService, PointsSummary } from '../../points/application/points.service.js';
import { Customer } from '../domain/customer.js';

const makeCustomer = (active = true) =>
  Customer.reconstruct({
    id: 7,
    firstName: 'Juan',
    lastName: 'Pérez',
    documentType: 'DNI',
    documentNumber: '12345678',
    email: 'juan@example.com',
    active,
  });

const summary: PointsSummary = {
  customerId: 7,
  balance: -350,
  negativeBalance: true,
  lifetimePoints: 1250,
  level: {
    current: 'GOLD',
    next: null,
    currentMinPoints: 800,
    nextMinPoints: null,
    pointsToNext: 0,
    progressPercent: 100,
  },
  nextExpirations: [],
};

describe('CustomerPointsService', () => {
  let customersService: { findById: jest.Mock };
  let pointsService: { resumen: jest.Mock };
  let service: CustomerPointsService;

  beforeEach(() => {
    customersService = { findById: jest.fn() };
    pointsService = { resumen: jest.fn() };
    service = new CustomerPointsService(
      customersService as unknown as CustomersService,
      pointsService as unknown as PointsService,
    );
  });

  it('devuelve el resumen de PointsService para un cliente existente', async () => {
    customersService.findById.mockResolvedValue(makeCustomer());
    pointsService.resumen.mockResolvedValue(summary);

    await expect(service.getSummary(7)).resolves.toEqual(summary);
    expect(customersService.findById).toHaveBeenCalledWith(7);
    expect(pointsService.resumen).toHaveBeenCalledWith(7);
  });

  it('también responde para un cliente inactivo (solo lectura, §8.2)', async () => {
    customersService.findById.mockResolvedValue(makeCustomer(false));
    pointsService.resumen.mockResolvedValue(summary);

    await expect(service.getSummary(7)).resolves.toEqual(summary);
  });

  it('propaga el 404 si el cliente no existe y no calcula nada', async () => {
    customersService.findById.mockRejectedValue(new NotFoundException('Customer with ID 7 not found'));

    await expect(service.getSummary(7)).rejects.toBeInstanceOf(NotFoundException);
    expect(pointsService.resumen).not.toHaveBeenCalled();
  });
});
