import { Logger } from '@nestjs/common';
import type { AuditService } from '../../audit/application/audit.service.js';
import { assertValidAuditEntry, type AuditEntryInput } from '../../audit/domain/audit-entry.js';
import { Reward, type RewardProps } from '../domain/reward.js';
import type { RewardRepository } from '../domain/port/reward.repository.js';
import type { TransactionRunner } from '../domain/port/transaction-runner.js';
import { RewardsAvailabilityService } from './rewards-availability.service.js';

const HOY = '2026-11-07';
// 07/11/2026 00:05 en Argentina
const NOW = new Date('2026-11-07T03:05:00.000Z');

function props(id: number, overrides: Partial<RewardProps> = {}): RewardProps {
  return {
    id,
    name: `Recompensa ${id}`,
    description: null,
    points: 150,
    stock: 5,
    expiresAt: null,
    status: 'ACTIVE',
    disabledReason: null,
    usedCount: 0,
    createdAt: new Date('2026-11-01T12:00:00.000Z'),
    updatedAt: new Date('2026-11-01T12:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function setup(rows: RewardProps[] = [], options: { lockedByOther?: number[] } = {}) {
  const store = new Map(rows.map((row) => [row.id, { ...row }]));
  const recorded: AuditEntryInput[] = [];
  const repository = {
    findExpiredCandidateIds: jest.fn(async (hoy: string) =>
      [...store.values()]
        .filter((row) => row.status === 'ACTIVE' && row.expiresAt !== null && row.expiresAt < hoy)
        .map((row) => row.id),
    ),
    lockForUpdateSkipLocked: jest.fn(async (id: number) => {
      if (options.lockedByOther?.includes(id)) return null;
      const row = store.get(id);
      return row ? Reward.reconstruct(row) : null;
    }),
    saveAvailability: jest.fn(async (reward: Reward) => {
      const row = store.get(reward.getId());
      if (row) {
        row.status = reward.getStatus();
        row.disabledReason = reward.getDisabledReason();
      }
    }),
  } as unknown as RewardRepository;
  const transactionRunner = {
    run: jest.fn(async <T>(fn: () => Promise<T>) => await fn()),
  } as unknown as TransactionRunner;
  const auditService = {
    record: jest.fn(async (entry: AuditEntryInput) => {
      assertValidAuditEntry(entry);
      recorded.push(entry);
    }),
  } as unknown as AuditService;
  const service = new RewardsAvailabilityService(repository, transactionRunner, auditService);
  return { service, store, recorded, repository, auditService };
}

describe('RewardsAvailabilityService (US-37)', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('reevaluarDisponibilidad (CA-37.1)', () => {
    it('ACTIVE con stock 0 → "DISABLED", guarda y audita "Motivo: Sin stock"', async () => {
      const { service, store, recorded } = setup([props(1, { stock: 0 })]);
      const reward = Reward.reconstruct(store.get(1) as RewardProps);

      await expect(service.reevaluarDisponibilidad(reward, HOY)).resolves.toBe('DISABLED');

      expect(store.get(1)).toMatchObject({ status: 'DISABLED', disabledReason: 'OUT_OF_STOCK' });
      expect(recorded).toEqual([
        {
          actor: { type: 'SYSTEM' },
          module: 'REWARDS',
          action: 'REWARD_DISABLED',
          description: 'Deshabilitó la recompensa "Recompensa 1"',
          details: [{ label: 'Motivo', value: 'Sin stock' }],
        },
      ]);
    });

    it('DISABLED / OUT_OF_STOCK con stock repuesto → "ENABLED" y "Motivo: Stock repuesto"', async () => {
      const { service, store, recorded } = setup([props(1, { status: 'DISABLED', disabledReason: 'OUT_OF_STOCK', stock: 3 })]);

      await expect(service.reevaluarDisponibilidad(Reward.reconstruct(store.get(1) as RewardProps), HOY)).resolves.toBe('ENABLED');

      expect(store.get(1)).toMatchObject({ status: 'ACTIVE', disabledReason: null });
      expect(recorded[0]).toMatchObject({ action: 'REWARD_ENABLED', details: [{ label: 'Motivo', value: 'Stock repuesto' }] });
    });

    it('DISABLED / EXPIRED con fecha nueva → "ENABLED" y "Motivo: Fecha de vencimiento actualizada"', async () => {
      const { service, store, recorded } = setup([props(1, { status: 'DISABLED', disabledReason: 'EXPIRED', expiresAt: HOY })]);

      await expect(service.reevaluarDisponibilidad(Reward.reconstruct(store.get(1) as RewardProps), HOY)).resolves.toBe('ENABLED');

      expect(recorded[0].details).toEqual([{ label: 'Motivo', value: 'Fecha de vencimiento actualizada' }]);
    });

    it('DISABLED que cambia de motivo: guarda y audita, pero devuelve null (no cambió de estado)', async () => {
      const { service, store, recorded } = setup([
        props(1, { status: 'DISABLED', disabledReason: 'OUT_OF_STOCK', stock: 10, expiresAt: '2026-11-06' }),
      ]);

      await expect(service.reevaluarDisponibilidad(Reward.reconstruct(store.get(1) as RewardProps), HOY)).resolves.toBeNull();

      expect(store.get(1)).toMatchObject({ status: 'DISABLED', disabledReason: 'EXPIRED' });
      expect(recorded[0]).toMatchObject({ action: 'REWARD_DISABLED', details: [{ label: 'Motivo', value: 'Vencida' }] });
    });

    it('sin cambio (o INACTIVE): null, sin guardar ni auditar', async () => {
      const { service, repository, recorded } = setup();

      await expect(service.reevaluarDisponibilidad(Reward.reconstruct(props(1)), HOY)).resolves.toBeNull();
      await expect(service.reevaluarDisponibilidad(Reward.reconstruct(props(2, { status: 'INACTIVE', stock: 0 })), HOY)).resolves.toBeNull();

      expect(repository.saveAvailability).not.toHaveBeenCalled();
      expect(recorded).toHaveLength(0);
    });
  });

  describe('runDailyExpiration (CA-37.2 a CA-37.5)', () => {
    it('deshabilita las ACTIVE vencidas ayer con "Motivo: Vencida"; las que vencen hoy no', async () => {
      const { service, store, recorded } = setup([
        props(1, { expiresAt: '2026-11-06' }),
        props(2, { expiresAt: HOY }),
        props(3, { expiresAt: null }),
        props(4, { status: 'INACTIVE', expiresAt: '2026-11-06' }),
      ]);

      const result = await service.runDailyExpiration(NOW);

      expect(result).toEqual({ disabled: 1, failures: [] });
      expect(store.get(1)).toMatchObject({ status: 'DISABLED', disabledReason: 'EXPIRED' });
      expect(store.get(2)?.status).toBe('ACTIVE');
      expect(store.get(3)?.status).toBe('ACTIVE');
      expect(store.get(4)?.status).toBe('INACTIVE');
      expect(recorded.map((entry) => entry.details)).toEqual([[{ label: 'Motivo', value: 'Vencida' }]]);
    });

    it('usa el día de Argentina: el 07/11 a las 00:05 de Argentina todavía es 07/11 en UTC −3', async () => {
      const { service, repository } = setup();

      await service.runDailyExpiration(NOW);

      expect(repository.findExpiredCandidateIds).toHaveBeenCalledWith(HOY);
    });

    it('correrlo dos veces no duplica auditorías', async () => {
      const { service, recorded } = setup([props(1, { expiresAt: '2026-11-06' })]);

      await service.runDailyExpiration(NOW);
      const second = await service.runDailyExpiration(NOW);

      expect(second).toEqual({ disabled: 0, failures: [] });
      expect(recorded).toHaveLength(1);
    });

    it('saltea la que otra operación tiene tomada', async () => {
      const { service, store } = setup([props(1, { expiresAt: '2026-11-06' })], { lockedByOther: [1] });

      expect(await service.runDailyExpiration(NOW)).toEqual({ disabled: 0, failures: [] });
      expect(store.get(1)?.status).toBe('ACTIVE');
    });

    it('si una falla, sigue con las demás y lo informa', async () => {
      const { service, store, auditService } = setup([
        props(1, { expiresAt: '2026-11-06' }),
        props(2, { expiresAt: '2026-11-05' }),
      ]);
      const boom = new Error('boom');
      (auditService.record as jest.Mock).mockRejectedValueOnce(boom);

      const result = await service.runDailyExpiration(NOW);

      expect(result.disabled).toBe(1);
      expect(result.failures).toEqual([{ rewardId: 1, error: boom }]);
      expect(store.get(2)?.status).toBe('DISABLED');
    });
  });
});
