import { ConflictException } from '@nestjs/common';
import { DomainError } from '../domain/errors/domain.error.js';
import type { Mission } from '../domain/mission.js';
import { MissionRepository } from '../domain/port/mission.repository.js';
import { currentArgentinaMonth, MISSION_NAME_IN_USE, MissionsService } from './missions.service.js';

// 01/11/2026 00:30 en Argentina (03:30 UTC)
const NOW = new Date('2026-11-01T03:30:00.000Z');

const saved: Mission = {
  id: 1,
  name: 'Vení 3 veces',
  description: null,
  objectiveType: 'CONSUMPTION_COUNT',
  target: 3,
  daysOfWeek: null,
  timeFrom: null,
  timeTo: null,
  rewardPoints: 50,
  startMonth: '2026-11',
  endMonth: null,
  pendingChanges: null,
  status: 'ACTIVE',
  createdAt: NOW,
  updatedAt: NOW,
};

function setup(nameInUse = false) {
  const repository = {
    existsNotDeletedWithName: jest.fn().mockResolvedValue(nameInUse),
    create: jest.fn().mockResolvedValue(saved),
    list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  };
  const service = new MissionsService(repository as unknown as MissionRepository);
  return { repository, service };
}

const input = {
  name: '  Vení 3 veces ',
  objectiveType: 'CONSUMPTION_COUNT' as const,
  target: 3,
  rewardPoints: 50,
  startMonth: '2026-11',
};

describe('currentArgentinaMonth', () => {
  it('usa la hora de Argentina: 01/11 02:59 UTC todavía es octubre', () => {
    expect(currentArgentinaMonth(new Date('2026-11-01T02:59:00.000Z'))).toBe('2026-10');
    expect(currentArgentinaMonth(new Date('2026-11-01T03:00:00.000Z'))).toBe('2026-11');
  });
});

describe('MissionsService.create (§3.1.3)', () => {
  it('controla el nombre ya recortado y guarda la misión normalizada', async () => {
    const { repository, service } = setup();

    await expect(service.create(input, NOW)).resolves.toBe(saved);

    expect(repository.existsNotDeletedWithName).toHaveBeenCalledWith('Vení 3 veces');
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Vení 3 veces', rewardPoints: 50 }));
  });

  it('nombre en uso → 409 MISSION_NAME_IN_USE sin guardar', async () => {
    const { repository, service } = setup(true);

    const error = await service.create(input, NOW).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toEqual(MISSION_NAME_IN_USE);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('mes de inicio anterior al actual → DomainError sin consultar ni guardar', async () => {
    const { repository, service } = setup();

    await expect(service.create({ ...input, startMonth: '2026-10' }, NOW)).rejects.toBeInstanceOf(DomainError);
    expect(repository.existsNotDeletedWithName).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });
});

describe('MissionsService.list (§3.1.2)', () => {
  it('pasa los filtros con el mes actual de Argentina', async () => {
    const { repository, service } = setup();

    await service.list({ q: 'vení', phase: 'RUNNING', order: 'OLDEST', page: 2, limit: 5 }, NOW);

    expect(repository.list).toHaveBeenCalledWith({
      q: 'vení',
      phase: 'RUNNING',
      order: 'OLDEST',
      page: 2,
      limit: 5,
      currentMonth: '2026-11',
    });
  });
});
