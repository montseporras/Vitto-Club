import { AuditService } from '../../audit/application/audit.service.js';
import type { AuditEntryInput } from '../../audit/domain/audit-entry.js';
import { CustomerMissionRepository, CustomerMissionView } from '../domain/port/customer-mission.repository.js';
import { MissionRepository } from '../domain/port/mission.repository.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import { MissionsClaimService } from './missions-claim.service.js';
import { END_OF_MONTH_EXPIRATION_REASON, MissionsExpirationService } from './missions-expiration.service.js';

// 01/12/2026 00:10 en Argentina (03:10 UTC)
const NOW = new Date('2026-12-01T03:10:00.000Z');

const view = (id: number, status: CustomerMissionView['status'], rewardPoints: number | null = 50): CustomerMissionView => ({
  id,
  mission: { id: 3, name: 'Vení 3 veces', description: null },
  customerId: 7,
  period: '2026-11',
  objectiveType: 'CONSUMPTION_COUNT',
  target: 3,
  daysOfWeek: null,
  timeFrom: null,
  timeTo: null,
  rewardPoints,
  progress: status === 'IN_PROGRESS' ? 1 : 3,
  status,
  completedAt: null,
  claimedAt: null,
  claimedBy: null,
});

class PassthroughRunner implements TransactionRunner {
  run<T>(fn: () => Promise<T>): Promise<T> {
    return fn();
  }
}

function setup(assignments: (CustomerMissionView | null)[], options: { failClaimOf?: number } = {}) {
  const byId = new Map<number, CustomerMissionView | null>(assignments.map((item, index) => [item?.id ?? 1000 + index, item]));
  const customerMissions = {
    findPendingBefore: jest
      .fn()
      .mockResolvedValue([...byId.keys()].map((id) => ({ id, period: byId.get(id)?.period ?? '2026-10' }))),
    lockForExpiration: jest.fn().mockImplementation((id: number) => Promise.resolve(byId.get(id) ?? null)),
    expire: jest.fn().mockResolvedValue(undefined),
  };
  const missions = { applyPendingChanges: jest.fn().mockResolvedValue(1) };
  const claims = {
    reclamar: jest.fn().mockImplementation((id: number) =>
      id === options.failClaimOf ? Promise.reject(new Error('falla el reclamo')) : Promise.resolve({}),
    ),
  };
  const recorded: AuditEntryInput[] = [];
  const audit = { record: jest.fn().mockImplementation((entry: AuditEntryInput) => Promise.resolve(void recorded.push(entry))) };
  const service = new MissionsExpirationService(
    missions as unknown as MissionRepository,
    customerMissions as unknown as CustomerMissionRepository,
    claims as unknown as MissionsClaimService,
    audit as unknown as AuditService,
    new PassthroughRunner(),
  );
  return { customerMissions, missions, claims, recorded, service };
}

describe('MissionsExpirationService.run (§3.4)', () => {
  it('busca las de meses ya terminados: antes del mes actual de Argentina', async () => {
    const { customerMissions, service } = setup([]);
    await service.run(NOW);
    expect(customerMissions.findPendingBefore).toHaveBeenCalledWith('2026-12');
  });

  it('En progreso → Vencida "Fin de mes"; Completada con recompensa → reclamo automático del Sistema', async () => {
    const { customerMissions, claims, service } = setup([view(1, 'IN_PROGRESS'), view(2, 'COMPLETED')]);

    const result = await service.run(NOW);

    expect(customerMissions.expire).toHaveBeenCalledWith(1, END_OF_MONTH_EXPIRATION_REASON, NOW);
    expect(claims.reclamar).toHaveBeenCalledWith(2, 'SYSTEM', { now: NOW });
    expect(result).toMatchObject({ expired: 1, claimed: 1, failures: [] });
  });

  it('Completada sin recompensa, ya resuelta o tomada por otra transacción (SKIP LOCKED): no hace nada', async () => {
    const { customerMissions, claims, recorded, service } = setup([view(1, 'COMPLETED', null), view(2, 'CLAIMED'), null]);

    const result = await service.run(NOW);

    expect(customerMissions.expire).not.toHaveBeenCalled();
    expect(claims.reclamar).not.toHaveBeenCalled();
    expect(result).toMatchObject({ expired: 0, claimed: 0 });
    // CA-32.5: si no venció ni se reclamó nada, no se audita
    expect(recorded).toEqual([]);
  });

  it('un fallo no frena el resto y no se cuenta', async () => {
    const { customerMissions, recorded, service } = setup([view(1, 'COMPLETED'), view(2, 'IN_PROGRESS')], { failClaimOf: 1 });

    const result = await service.run(NOW);

    expect(customerMissions.expire).toHaveBeenCalledWith(2, END_OF_MONTH_EXPIRATION_REASON, NOW);
    expect(result.expired).toBe(1);
    expect(result.claimed).toBe(0);
    expect(result.failures.map((failure) => failure.customerMissionId)).toEqual([1]);
    expect(recorded).toHaveLength(1);
  });

  it('una sola MISSIONS_EXPIRED por corrida, con los totales', async () => {
    const { recorded, service } = setup([view(1, 'IN_PROGRESS'), view(2, 'IN_PROGRESS'), view(3, 'COMPLETED')]);

    await service.run(NOW);

    expect(recorded).toEqual([
      expect.objectContaining({
        actor: { type: 'SYSTEM' },
        action: 'MISSIONS_EXPIRED',
        details: [
          { label: 'Período', value: 'Noviembre 2026' },
          { label: 'Misiones vencidas', value: '2' },
          { label: 'Recompensas reclamadas automáticamente', value: '1' },
        ],
      }),
    ]);
  });

  it('aplica los cambios pendientes que ya rigen, con el mes actual', async () => {
    const { missions, service } = setup([]);

    const result = await service.run(NOW);

    expect(missions.applyPendingChanges).toHaveBeenCalledWith('2026-12');
    expect(result.appliedPendingChanges).toBe(1);
  });
});
