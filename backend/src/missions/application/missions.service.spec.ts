import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DomainError } from '../domain/errors/domain.error.js';
import type { Mission } from '../domain/mission.js';
import { CustomerMissionRepository } from '../domain/port/customer-mission.repository.js';
import { MissionRepository } from '../domain/port/mission.repository.js';
import {
  currentArgentinaMonth,
  DELETED_MISSION_EXPIRATION_REASON,
  MISSION_NAME_IN_USE,
  MISSION_NOT_FOUND_MESSAGE,
  MissionsService,
} from './missions.service.js';

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

function setup(options: { nameInUse?: boolean; found?: Mission | null; hasAssignments?: boolean } = {}) {
  const found = options.found === undefined ? saved : options.found;
  const missions = {
    existsNotDeletedWithName: jest.fn().mockResolvedValue(options.nameInUse ?? false),
    create: jest.fn().mockResolvedValue(saved),
    list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    findNotDeletedById: jest.fn().mockResolvedValue(found),
    lockNotDeletedForUpdate: jest.fn().mockResolvedValue(found),
    countCompleted: jest.fn().mockResolvedValue(4),
    update: jest.fn().mockImplementation((_id: number, state: Partial<Mission>) => Promise.resolve({ ...saved, ...state })),
    markDeleted: jest.fn().mockResolvedValue({ ...saved, status: 'DELETED' }),
  };
  const customerMissions = {
    existsForPeriod: jest.fn().mockResolvedValue(options.hasAssignments ?? false),
    expireInProgress: jest.fn().mockResolvedValue(2),
    findCompleted: jest.fn().mockResolvedValue([]),
  };
  const service = new MissionsService(
    missions as unknown as MissionRepository,
    customerMissions as unknown as CustomerMissionRepository,
  );
  return { missions, customerMissions, service };
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
    const { missions, service } = setup();

    await expect(service.create(input, NOW)).resolves.toBe(saved);

    expect(missions.existsNotDeletedWithName).toHaveBeenCalledWith('Vení 3 veces');
    expect(missions.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Vení 3 veces', rewardPoints: 50 }));
  });

  it('nombre en uso → 409 MISSION_NAME_IN_USE sin guardar', async () => {
    const { missions, service } = setup({ nameInUse: true });

    const error = await service.create(input, NOW).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toEqual(MISSION_NAME_IN_USE);
    expect(missions.create).not.toHaveBeenCalled();
  });

  it('mes de inicio anterior al actual → DomainError sin consultar ni guardar', async () => {
    const { missions, service } = setup();

    await expect(service.create({ ...input, startMonth: '2026-10' }, NOW)).rejects.toBeInstanceOf(DomainError);
    expect(missions.existsNotDeletedWithName).not.toHaveBeenCalled();
    expect(missions.create).not.toHaveBeenCalled();
  });
});

describe('MissionsService.list (§3.1.2)', () => {
  it('pasa los filtros con el mes actual de Argentina', async () => {
    const { missions, service } = setup();

    await service.list({ q: 'vení', phase: 'RUNNING', order: 'OLDEST', page: 2, limit: 5 }, NOW);

    expect(missions.list).toHaveBeenCalledWith({
      q: 'vení',
      phase: 'RUNNING',
      order: 'OLDEST',
      page: 2,
      limit: 5,
      currentMonth: '2026-11',
    });
  });
});

describe('MissionsService.getById (§3.1.6)', () => {
  it('con sus completadas del mes actual', async () => {
    const { missions, service } = setup();

    await expect(service.getById(1, NOW)).resolves.toEqual({ mission: saved, completedCount: 4 });
    expect(missions.countCompleted).toHaveBeenCalledWith(1, '2026-11');
  });

  it('no existe o está dada de baja → 404 "No existe la misión."', async () => {
    const { service } = setup({ found: null });
    await expect(service.getById(1, NOW)).rejects.toThrow(new NotFoundException(MISSION_NOT_FOUND_MESSAGE));
  });
});

describe('MissionsService.update (§3.1.4)', () => {
  it('sin ningún campo → 400 "Modificá al menos un dato." sin bloquear', async () => {
    const { missions, service } = setup();

    await expect(service.update(1, {}, NOW)).rejects.toThrow(new BadRequestException('Modificá al menos un dato.'));
    expect(missions.lockNotDeletedForUpdate).not.toHaveBeenCalled();
  });

  it('bloquea la misión y mira si tiene clientes este mes', async () => {
    const { missions, customerMissions, service } = setup({ hasAssignments: true });

    const result = await service.update(1, { target: 5 }, NOW);

    expect(missions.lockNotDeletedForUpdate).toHaveBeenCalledWith(1);
    expect(customerMissions.existsForPeriod).toHaveBeenCalledWith(1, '2026-11');
    expect(result.plan.appliesFrom).toBe('2026-12');
    expect(missions.update).toHaveBeenCalledWith(1, expect.objectContaining({ target: 3 }));
  });

  it('no existe o está dada de baja → 404', async () => {
    const { service } = setup({ found: null });
    await expect(service.update(1, { name: 'Otra' }, NOW)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('nombre nuevo en uso → 409 sin guardar; sin contarse a sí misma', async () => {
    const { missions, service } = setup({ nameInUse: true });

    await expect(service.update(1, { name: 'Otra' }, NOW)).rejects.toBeInstanceOf(ConflictException);
    expect(missions.existsNotDeletedWithName).toHaveBeenCalledWith('Otra', 1);
    expect(missions.update).not.toHaveBeenCalled();
  });

  it('el mismo nombre no se controla', async () => {
    const { missions, service } = setup({ nameInUse: true });

    await service.update(1, { name: 'Vení 3 veces', description: 'Nueva' }, NOW);
    expect(missions.existsNotDeletedWithName).not.toHaveBeenCalled();
  });

  it('sin cambios → no guarda', async () => {
    const { missions, service } = setup();

    const result = await service.update(1, { target: 3 }, NOW);
    expect(result.plan.changed).toBe(false);
    expect(missions.update).not.toHaveBeenCalled();
  });
});

describe('MissionsService.delete (§3.1.5)', () => {
  it('vence las En progreso del mes con "Misión dada de baja" y la da de baja', async () => {
    const { missions, customerMissions, service } = setup();

    const result = await service.delete(1, NOW);

    expect(missions.lockNotDeletedForUpdate).toHaveBeenCalledWith(1);
    expect(customerMissions.expireInProgress).toHaveBeenCalledWith(1, '2026-11', DELETED_MISSION_EXPIRATION_REASON, NOW);
    expect(missions.markDeleted).toHaveBeenCalledWith(1, NOW);
    expect(result).toMatchObject({ expired: 2, claimed: 0 });
  });

  it('no existe o ya está dada de baja → 404 sin tocar nada', async () => {
    const { customerMissions, missions, service } = setup({ found: null });

    await expect(service.delete(1, NOW)).rejects.toBeInstanceOf(NotFoundException);
    expect(customerMissions.expireInProgress).not.toHaveBeenCalled();
    expect(missions.markDeleted).not.toHaveBeenCalled();
  });
});

describe('MissionsService.completed (§3.1.7)', () => {
  it('sin mes → el actual', async () => {
    const { customerMissions, service } = setup();

    await service.completed(1, undefined, NOW);
    expect(customerMissions.findCompleted).toHaveBeenCalledWith(1, '2026-11');
  });

  it('mes inválido → DomainError antes de buscar la misión', async () => {
    const { missions, service } = setup();

    await expect(service.completed(1, '2026-12', NOW)).rejects.toBeInstanceOf(DomainError);
    expect(missions.findNotDeletedById).not.toHaveBeenCalled();
  });

  it('misión dada de baja → 404', async () => {
    const { service } = setup({ found: null });
    await expect(service.completed(1, undefined, NOW)).rejects.toBeInstanceOf(NotFoundException);
  });
});
