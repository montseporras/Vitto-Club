import { ConflictException } from '@nestjs/common';
import { RewardsService } from './rewards.service.js';
import { Reward } from '../domain/reward.js';
import { DomainError } from '../domain/errors/domain.error.js';
import { RewardRepository } from '../domain/port/reward.repository.js';

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
    existsNotDeletedWithName: jest.Mock;
    create: jest.Mock;
    list: jest.Mock;
  };
  let service: RewardsService;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      existsNotDeletedWithName: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue(saved),
      list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    service = new RewardsService(repository as unknown as RewardRepository);
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

  it('list pasa los filtros y la hora al repositorio', async () => {
    const filters = { q: 'cafe', status: 'ACTIVE' as const, page: 2, limit: 10 };

    await service.list(filters, NOW);

    expect(repository.list).toHaveBeenCalledWith(filters, NOW);
  });
});
