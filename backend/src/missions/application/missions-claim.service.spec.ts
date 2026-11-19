import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AuditService } from '../../audit/application/audit.service.js';
import { PointsService } from '../../points/application/points.service.js';
import { CLAIM_MESSAGES } from '../domain/mission-claim.js';
import { CustomerMissionRepository, CustomerMissionView } from '../domain/port/customer-mission.repository.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import { MissionsClaimService } from './missions-claim.service.js';

const NOW = new Date('2026-11-15T15:00:00.000Z');

const completed: CustomerMissionView = {
  id: 41,
  mission: { id: 3, name: 'Vení 3 veces', description: null },
  customerId: 7,
  period: '2026-11',
  objectiveType: 'CONSUMPTION_COUNT',
  target: 3,
  daysOfWeek: null,
  timeFrom: null,
  timeTo: null,
  rewardPoints: 50,
  progress: 3,
  status: 'COMPLETED',
  completedAt: NOW,
  claimedAt: null,
  claimedBy: null,
};

const customer = {
  id: 7,
  firstName: 'Martín',
  lastName: 'Gómez',
  documentType: 'DNI' as const,
  documentNumber: '41987654',
};

class PassthroughRunner implements TransactionRunner {
  run<T>(fn: () => Promise<T>): Promise<T> {
    return fn();
  }
}

function setup(found: CustomerMissionView | null = completed, active = true) {
  const repository = {
    lockById: jest.fn().mockResolvedValue(found),
    findCustomer: jest.fn().mockResolvedValue({ ...customer, isActive: active }),
    markClaimed: jest
      .fn()
      .mockImplementation((id: number, by: 'CUSTOMER' | 'SYSTEM', now: Date) =>
        Promise.resolve({ ...completed, id, status: 'CLAIMED', claimedAt: now, claimedBy: by }),
      ),
  };
  const points = { acreditarBonificacion: jest.fn().mockResolvedValue({ balanceAfter: 550 }) };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new MissionsClaimService(
    repository as unknown as CustomerMissionRepository,
    points as unknown as PointsService,
    audit as unknown as AuditService,
    new PassthroughRunner(),
  );
  return { repository, points, audit, service };
}

describe('MissionsClaimService.reclamar (§3.3.3)', () => {
  it('Completada con recompensa: acredita MISSION_REWARD, pasa a Reclamada y audita a nombre del Sistema', async () => {
    const { repository, points, audit, service } = setup();

    const result = await service.reclamarDelCliente(41, 7, NOW);

    expect(repository.lockById).toHaveBeenCalledWith(41);
    expect(points.acreditarBonificacion).toHaveBeenCalledWith({
      customerId: 7,
      type: 'MISSION_REWARD',
      points: 50,
      customerMissionId: 41,
    });
    expect(repository.markClaimed).toHaveBeenCalledWith(41, 'CUSTOMER', NOW);
    expect(result).toMatchObject({ balanceAfter: 550, customerMission: { status: 'CLAIMED', claimedBy: 'CUSTOMER' } });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { type: 'SYSTEM' },
        action: 'MISSION_REWARD_CLAIMED',
        details: expect.arrayContaining([{ label: 'Reclamada por', value: 'Cliente' }]),
      }),
    );
  });

  it('ajena → 404 sin acreditar', async () => {
    const { points, service } = setup();
    await expect(service.reclamarDelCliente(41, 99, NOW)).rejects.toBeInstanceOf(NotFoundException);
    expect(points.acreditarBonificacion).not.toHaveBeenCalled();
  });

  it('inexistente → 404 sin acreditar', async () => {
    const { points, service } = setup(null);
    await expect(service.reclamarDelCliente(41, 7, NOW)).rejects.toBeInstanceOf(NotFoundException);
    expect(points.acreditarBonificacion).not.toHaveBeenCalled();
  });

  it.each([
    ['IN_PROGRESS', 50, CLAIM_MESSAGES.notCompleted],
    ['CLAIMED', 50, CLAIM_MESSAGES.alreadyClaimed],
    ['EXPIRED', 50, CLAIM_MESSAGES.expired],
    ['COMPLETED', null, CLAIM_MESSAGES.noReward],
  ] as const)('%s → 409 MISSION_NOT_CLAIMABLE "%s"', async (status, rewardPoints, message) => {
    const { points, service } = setup({ ...completed, status, rewardPoints });

    const error = await service.reclamarDelCliente(41, 7, NOW).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toEqual({ message, code: 'MISSION_NOT_CLAIMABLE' });
    expect(points.acreditarBonificacion).not.toHaveBeenCalled();
  });

  it('cliente dado de baja con token vivo → 401 UNAUTHENTICATED', async () => {
    const { points, service } = setup(completed, false);

    await expect(service.reclamarDelCliente(41, 7, NOW)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(points.acreditarBonificacion).not.toHaveBeenCalled();
  });

  it('el Sistema reclama aunque el cliente esté dado de baja, con "Reclamada por: Automático"', async () => {
    const { repository, audit, service } = setup(completed, false);

    await service.reclamar(41, 'SYSTEM', { now: NOW });

    expect(repository.markClaimed).toHaveBeenCalledWith(41, 'SYSTEM', NOW);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ details: expect.arrayContaining([{ label: 'Reclamada por', value: 'Automático' }]) }),
    );
  });
});
