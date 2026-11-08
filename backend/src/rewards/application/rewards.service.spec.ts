import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { RewardsService } from './rewards.service.js';
import { Reward } from '../domain/reward.js';
import { DomainError } from '../domain/errors/domain.error.js';
import { RewardRepository } from '../domain/port/reward.repository.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import { RewardsAvailabilityService } from './rewards-availability.service.js';
import { AuditService } from '../../audit/application/audit.service.js';

const ADMIN = { type: 'EMPLOYEE' as const, accountId: 1 };

// Los datos de una Reward, para armar otra igual con un campo cambiado
const propsOf = (reward: Reward) => ({
  id: reward.getId(),
  name: reward.getName(),
  description: reward.getDescription(),
  points: reward.getPoints(),
  stock: reward.getStock(),
  expiresAt: reward.getExpiresAt(),
  status: reward.getStatus(),
  disabledReason: reward.getDisabledReason(),
  usedCount: reward.getUsedCount(),
  createdAt: reward.getCreatedAt(),
  updatedAt: reward.getUpdatedAt(),
  deletedAt: reward.getDeletedAt(),
});

// 08/11/2026 12:00 en Argentina
const NOW = new Date('2026-11-08T15:00:00.000Z');

const saved = Reward.reconstruct({
  id: 1,
  name: 'Café + medialuna',
  description: null,
  points: 150,
  stock: 20,
  expiresAt: '2026-12-08',
  status: 'ACTIVE',
  disabledReason: null,
  usedCount: 0,
  createdAt: NOW,
  updatedAt: NOW,
  deletedAt: null,
});

describe('RewardsService', () => {
  let repository: {
    findById: jest.Mock;
    findNotDeletedById: jest.Mock;
    lockNotDeletedForUpdate: jest.Mock;
    countConfirmed: jest.Mock;
    update: jest.Mock;
    existsNotDeletedWithName: jest.Mock;
    create: jest.Mock;
    list: jest.Mock;
  };
  let service: RewardsService;
  let reevaluarDisponibilidad: jest.Mock;
  let record: jest.Mock;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findNotDeletedById: jest.fn().mockResolvedValue(saved),
      lockNotDeletedForUpdate: jest.fn().mockResolvedValue(saved),
      countConfirmed: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockImplementation(async () => saved),
      existsNotDeletedWithName: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue(saved),
      list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    reevaluarDisponibilidad = jest.fn().mockResolvedValue(null);
    record = jest.fn().mockResolvedValue(undefined);
    service = new RewardsService(
      repository as unknown as RewardRepository,
      { reevaluarDisponibilidad } as unknown as RewardsAvailabilityService,
      { record } as unknown as AuditService,
      { run: <T>(fn: () => Promise<T>) => fn() } as TransactionRunner,
    );
  });

  describe('create (US-34)', () => {
    const input = { name: '  Café + medialuna ', description: '', points: 150, stock: 20, expiresAt: '2026-12-08' };

    it('guarda los datos normalizados y devuelve la recompensa', async () => {
      await expect(service.create(input, NOW)).resolves.toBe(saved);

      expect(repository.existsNotDeletedWithName).toHaveBeenCalledWith('Café + medialuna');
      expect(repository.create).toHaveBeenCalledWith({
        name: 'Café + medialuna',
        description: null,
        points: 150,
        stock: 20,
        expiresAt: '2026-12-08',
      });
    });

    it('nombre repetido → 409 REWARD_NAME_IN_USE sin guardar (CA-34.5)', async () => {
      repository.existsNotDeletedWithName.mockResolvedValue(true);

      const error = await service.create(input, NOW).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toEqual({
        message: 'Ya existe una recompensa con ese nombre.',
        code: 'REWARD_NAME_IN_USE',
      });
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('"hoy" es la fecha de Argentina: a las 23:30 del 07/11 (02:30 UTC del 08) el 07/11 vale', async () => {
      const lateNight = new Date('2026-11-08T02:30:00.000Z');

      await expect(service.create({ ...input, expiresAt: '2026-11-07' }, lateNight)).resolves.toBe(saved);
    });

    it('fecha anterior a hoy → DomainError (400) sin guardar', async () => {
      await expect(service.create({ ...input, expiresAt: '2026-11-07' }, NOW)).rejects.toThrow(DomainError);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('getById (US-35)', () => {
    it('devuelve la recompensa con sus confirmados', async () => {
      repository.countConfirmed.mockResolvedValue(2);

      await expect(service.getById(1, NOW)).resolves.toEqual({ reward: saved, confirmedCount: 2 });
      expect(repository.countConfirmed).toHaveBeenCalledWith(1, NOW);
    });

    it('no existe o está dada de baja → 404 "No existe la recompensa."', async () => {
      repository.findNotDeletedById.mockResolvedValue(null);

      await expect(service.getById(9, NOW)).rejects.toThrow(new NotFoundException('No existe la recompensa.'));
    });
  });

  describe('update (US-35)', () => {
    it('body vacío → 400 "Indicá al menos un campo para modificar." sin bloquear nada', async () => {
      await expect(service.update(1, {}, ADMIN, NOW)).rejects.toThrow(
        new BadRequestException('Indicá al menos un campo para modificar.'),
      );
      expect(repository.lockNotDeletedForUpdate).not.toHaveBeenCalled();
    });

    it('dada de baja o inexistente → 404', async () => {
      repository.lockNotDeletedForUpdate.mockResolvedValue(null);

      await expect(service.update(1, { points: 200 }, ADMIN, NOW)).rejects.toThrow(NotFoundException);
    });

    it('guarda los campos, audita REWARD_UPDATED y después reevalúa la disponibilidad (US-37)', async () => {
      reevaluarDisponibilidad.mockResolvedValue('DISABLED');
      const withoutStock = Reward.reconstruct({ ...propsOf(saved), stock: 0 });
      repository.update.mockResolvedValue(withoutStock);

      const result = await service.update(1, { stock: 0 }, ADMIN, NOW);

      // El estado no lo decide la edición: queda como estaba y lo reevalúa US-37
      expect(repository.update).toHaveBeenCalledWith(1, {
        name: 'Café + medialuna',
        description: null,
        points: 150,
        stock: 0,
        expiresAt: '2026-12-08',
        status: 'ACTIVE',
        disabledReason: null,
      });
      expect(record).toHaveBeenCalledWith(expect.objectContaining({ actor: ADMIN, action: 'REWARD_UPDATED' }));
      expect(reevaluarDisponibilidad).toHaveBeenCalledWith(withoutStock, '2026-11-08');
      expect(record.mock.invocationCallOrder[0]).toBeLessThan(reevaluarDisponibilidad.mock.invocationCallOrder[0]);
      expect(result).toMatchObject({ changes: [{ field: 'stock', before: 20, after: 0 }], availabilityChange: 'DISABLED' });
    });

    it('sin cambios → no guarda (ni updatedAt) y responde la misma', async () => {
      const result = await service.update(1, { points: 150, stock: 20 }, ADMIN, NOW);

      expect(repository.update).not.toHaveBeenCalled();
      expect(record).not.toHaveBeenCalled();
      expect(reevaluarDisponibilidad).not.toHaveBeenCalled();
      expect(result).toMatchObject({ reward: saved, changes: [], availabilityChange: null });
    });

    it('stock menor que los confirmados → 409 STOCK_BELOW_CONFIRMED con {n} (CA-35.3)', async () => {
      repository.countConfirmed.mockResolvedValue(2);

      const error = await service.update(1, { stock: 1 }, ADMIN, NOW).catch((caught: unknown) => caught);

      expect((error as ConflictException).getResponse()).toEqual({
        message: 'El stock no puede ser menor a los 2 canjes confirmados.',
        code: 'STOCK_BELOW_CONFIRMED',
      });
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('stock igual a los confirmados, o sin límite, se acepta', async () => {
      repository.countConfirmed.mockResolvedValue(2);

      await expect(service.update(1, { stock: 2 }, ADMIN, NOW)).resolves.toBeDefined();
      await expect(service.update(1, { stock: null }, ADMIN, NOW)).resolves.toBeDefined();
    });

    it('nombre de otra no dada de baja → 409 REWARD_NAME_IN_USE; se excluye a sí misma', async () => {
      repository.existsNotDeletedWithName.mockResolvedValue(true);

      await expect(service.update(1, { name: 'Brunch' }, ADMIN, NOW)).rejects.toThrow(ConflictException);
      expect(repository.existsNotDeletedWithName).toHaveBeenCalledWith('Brunch', 1);
    });

    it('el mismo nombre no se vuelve a verificar', async () => {
      await service.update(1, { name: 'Café + medialuna', points: 200 }, ADMIN, NOW);

      expect(repository.existsNotDeletedWithName).not.toHaveBeenCalled();
    });
  });

  it('list pasa los filtros y la hora al repositorio', async () => {
    const filters = { q: 'cafe', status: 'ACTIVE' as const, page: 2, limit: 10 };

    await service.list(filters, NOW);

    expect(repository.list).toHaveBeenCalledWith(filters, NOW);
  });
});
