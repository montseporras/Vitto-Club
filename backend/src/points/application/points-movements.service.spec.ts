import { NotFoundException } from '@nestjs/common';
import { PointsMovementsService } from './points-movements.service.js';
import { PointsMovementsRepository } from '../domain/port/points-movements.repository.js';
import type { PointsMovementRecord } from '../domain/points-movement.js';
import { DomainError } from '../domain/errors/domain.error.js';

const record: PointsMovementRecord = {
  id: 1,
  createdAt: new Date('2026-10-16T18:40:00.000Z'),
  customer: { id: 3, firstName: 'Carolina', lastName: 'Fernández', documentType: 'DNI', documentNumber: '38456001' },
  type: 'CONSUMPTION_CREDIT',
  points: 500,
  balanceAfter: 500,
  consumptionId: 131,
  reason: null,
  lot: null,
  performedByAccountId: 4,
  performedByName: 'Ana Gómez',
};

describe('PointsMovementsService', () => {
  let repository: { customerExists: jest.Mock; list: jest.Mock };
  let service: PointsMovementsService;

  beforeEach(() => {
    repository = {
      customerExists: jest.fn().mockResolvedValue(true),
      list: jest.fn().mockResolvedValue({ items: [record], total: 1 }),
    };
    service = new PointsMovementsService(repository as unknown as PointsMovementsRepository);
  });

  describe('listByCustomer() — CA-26.1', () => {
    it('Cajero: fuerza las últimas 24 h aunque mande last24h=false', async () => {
      const before = Date.now();
      await service.listByCustomer({ customerId: 3, viewerRole: 'CASHIER', last24h: false, page: 1, limit: 5 });

      const filters = repository.list.mock.calls[0][0];
      expect(filters.customerId).toBe(3);
      expect(filters.createdFrom).toBeInstanceOf(Date);
      expect(before - filters.createdFrom.getTime()).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000 - 1000);
      expect(before - filters.createdFrom.getTime()).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 1000);
    });

    it('Administrador: por defecto ve todo', async () => {
      await service.listByCustomer({ customerId: 3, viewerRole: 'ADMIN', page: 1, limit: 20 });

      expect(repository.list.mock.calls[0][0].createdFrom).toBeUndefined();
    });

    it('Administrador con last24h=true: filtra las últimas 24 h', async () => {
      await service.listByCustomer({ customerId: 3, viewerRole: 'ADMIN', last24h: true, page: 1, limit: 20 });

      expect(repository.list.mock.calls[0][0].createdFrom).toBeInstanceOf(Date);
    });

    it('pasa type y paginación, y arma la página con description', async () => {
      const result = await service.listByCustomer({
        customerId: 3,
        viewerRole: 'ADMIN',
        type: 'CONSUMPTION_CREDIT',
        page: 2,
        limit: 5,
      });

      expect(repository.list).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: 3, type: 'CONSUMPTION_CREDIT', page: 2, limit: 5 }),
      );
      expect(result).toMatchObject({ total: 1, page: 2, limit: 5 });
      expect(result.items[0].description).toBe('Consumo C-000131');
    });

    it('cliente inexistente → 404 "No existe el cliente {id}."', async () => {
      repository.customerExists.mockResolvedValue(false);

      await expect(
        service.listByCustomer({ customerId: 99, viewerRole: 'ADMIN', page: 1, limit: 20 }),
      ).rejects.toThrow(new NotFoundException('No existe el cliente 99.'));
      expect(repository.list).not.toHaveBeenCalled();
    });
  });

  describe('listMine()', () => {
    it('filtra por el cliente del token, sin fechas', async () => {
      await service.listMine({ customerId: 3, type: 'EXPIRATION', page: 1, limit: 20 });

      expect(repository.list).toHaveBeenCalledWith({ customerId: 3, type: 'EXPIRATION', page: 1, limit: 20 });
      expect(repository.customerExists).not.toHaveBeenCalled();
    });
  });

  describe('listAll() — CA-26.4', () => {
    it('convierte fechas y q en filtros', async () => {
      await service.listAll({
        q: 'perez',
        customerId: 3,
        fromDate: '2026-10-01',
        toDate: '2026-10-16',
        type: 'VOID_REVERSAL',
        page: 1,
        limit: 10,
      });

      expect(repository.list).toHaveBeenCalledWith({
        customerId: 3,
        search: { kind: 'name', terms: ['perez'] },
        type: 'VOID_REVERSAL',
        createdFrom: new Date('2026-10-01T03:00:00.000Z'),
        createdBefore: new Date('2026-10-17T03:00:00.000Z'),
        page: 1,
        limit: 10,
      });
    });

    it('rango invertido → DomainError y no consulta', async () => {
      await expect(
        service.listAll({ fromDate: '2026-10-17', toDate: '2026-10-16', page: 1, limit: 10 }),
      ).rejects.toBeInstanceOf(DomainError);
      expect(repository.list).not.toHaveBeenCalled();
    });
  });
});
