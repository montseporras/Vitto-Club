import { Logger } from '@nestjs/common';
import type { AuditService } from '../../audit/application/audit.service.js';
import { assertValidAuditEntry, type AuditEntryInput } from '../../audit/domain/audit-entry.js';
import {
  Redemption,
  REDEMPTION_DURATION_MS,
  type RedemptionProps,
} from '../domain/redemption.js';
import type {
  RedemptionCustomer,
  RedemptionExpirationFilter,
  RedemptionRepository,
} from '../domain/port/redemption.repository.js';
import type { TransactionRunner } from '../domain/port/transaction-runner.js';
import { RedemptionsExpirationService } from './redemptions-expiration.service.js';

const createdAt = new Date('2026-11-07T15:00:00.000Z');
const expiresAt = new Date(createdAt.getTime() + REDEMPTION_DURATION_MS);
const now = new Date(expiresAt.getTime() + 60_000);

const customer: RedemptionCustomer = {
  id: 101,
  firstName: 'Carolina',
  lastName: 'Fernández',
  documentType: 'DNI',
  documentNumber: '38456123',
};

function props(id: number, overrides: Partial<RedemptionProps> = {}): RedemptionProps {
  return {
    id,
    code: `K7MP2${'ABCDEFGH'[id]}`,
    customerId: customer.id,
    rewardId: 20,
    rewardName: 'Café + medialuna',
    points: 150,
    status: 'CONFIRMED',
    origin: 'APP',
    confirmedByAccountId: null,
    confirmedByName: null,
    createdAt,
    expiresAt,
    resolvedAt: null,
    resolvedByAccountId: null,
    resolvedByName: null,
    rejectionReason: null,
    balanceBefore: null,
    balanceAfter: null,
    ...overrides,
  };
}

// Repositorio en memoria: guarda lo que se persiste y simula canjes tomados por otro proceso
function setup(rows: RedemptionProps[], options: { lockedByOther?: number[] } = {}) {
  const store = new Map(rows.map((row) => [row.id, { ...row }]));
  const saved: Redemption[] = [];
  const recorded: AuditEntryInput[] = [];
  const lockCalls: { id: number; mode: 'skip-locked' | 'wait' }[] = [];

  const repository = {
    findExpiredCandidateIds: jest.fn(async (filter: RedemptionExpirationFilter, at: Date) =>
      [...store.values()]
        .filter((row) => row.status === 'CONFIRMED' && row.expiresAt.getTime() <= at.getTime())
        .filter((row) =>
          'code' in filter ? row.code === filter.code : 'customerId' in filter ? row.customerId === filter.customerId : true,
        )
        .map((row) => row.id),
    ),
    lockForExpirationSkipLocked: jest.fn(async (id: number) => {
      lockCalls.push({ id, mode: 'skip-locked' });
      if (options.lockedByOther?.includes(id)) return null;
      const row = store.get(id);
      return row ? Redemption.reconstruct(row) : null;
    }),
    lockForUpdate: jest.fn(async (id: number) => {
      lockCalls.push({ id, mode: 'wait' });
      const row = store.get(id);
      return row ? Redemption.reconstruct(row) : null;
    }),
    saveExpiration: jest.fn(async (redemption: Redemption) => {
      saved.push(redemption);
      const row = store.get(redemption.getId());
      if (row) {
        row.status = redemption.getStatus();
        row.resolvedAt = redemption.getResolvedAt();
        row.resolvedByAccountId = redemption.getResolvedByAccountId();
        row.resolvedByName = redemption.getResolvedByName();
      }
    }),
    findCustomer: jest.fn(async () => customer),
  } as unknown as RedemptionRepository;

  const transactionRunner = {
    run: jest.fn(async <T>(fn: () => Promise<T>) => await fn()),
  } as unknown as TransactionRunner;

  const auditService = {
    record: jest.fn(async (entry: AuditEntryInput) => {
      assertValidAuditEntry(entry);
      recorded.push(entry);
    }),
  } as unknown as AuditService;

  const service = new RedemptionsExpirationService(repository, transactionRunner, auditService);
  return { service, store, saved, recorded, lockCalls, repository, transactionRunner, auditService };
}

describe('RedemptionsExpirationService (US-44)', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('run(): el barrido (CA-44.3 y CA-44.4)', () => {
    it('vence los Confirmados vencidos, cada uno en su transacción con SKIP LOCKED, y audita Sistema', async () => {
      const { service, store, recorded, lockCalls, transactionRunner } = setup([props(1), props(2)]);

      const result = await service.run(now);

      expect(result).toEqual({ expired: 2, failures: [] });
      expect(transactionRunner.run).toHaveBeenCalledTimes(2);
      expect(lockCalls).toEqual([
        { id: 1, mode: 'skip-locked' },
        { id: 2, mode: 'skip-locked' },
      ]);
      expect(store.get(1)).toMatchObject({
        status: 'EXPIRED',
        resolvedAt: expiresAt,
        resolvedByAccountId: null,
        resolvedByName: 'Sistema',
      });
      expect(recorded).toHaveLength(2);
      expect(recorded[0]).toMatchObject({
        actor: { type: 'SYSTEM' },
        module: 'REDEMPTIONS',
        action: 'REDEMPTION_EXPIRED',
        description: 'Venció el canje de Carolina Fernández',
        operationCode: 'K7MP2B',
        details: [
          { label: 'Código del canje', value: 'K7MP2B' },
          { label: 'Recompensa', value: 'Café + medialuna' },
        ],
      });
    });

    it('resolvedAt es expiresAt, no la hora del barrido', async () => {
      const { service, saved } = setup([props(1)]);

      await service.run(new Date(expiresAt.getTime() + 4 * 60_000));

      expect(saved[0].getResolvedAt()).toEqual(expiresAt);
    });

    it('no toca los vigentes ni los finales (CA-44.6)', async () => {
      const vigente = props(1, {
        createdAt: new Date(now.getTime() - REDEMPTION_DURATION_MS + 1000),
        expiresAt: new Date(now.getTime() + 1000),
      });
      const used = props(2, { status: 'USED', resolvedAt: createdAt, balanceBefore: 300, balanceAfter: 150 });
      const { service, store, recorded } = setup([vigente, used]);

      const result = await service.run(now);

      expect(result.expired).toBe(0);
      expect(store.get(1)?.status).toBe('CONFIRMED');
      expect(store.get(2)?.status).toBe('USED');
      expect(recorded).toHaveLength(0);
    });

    it('saltea el canje que otro proceso tiene tomado, sin auditar', async () => {
      const { service, store, recorded } = setup([props(1), props(2)], { lockedByOther: [1] });

      const result = await service.run(now);

      expect(result).toEqual({ expired: 1, failures: [] });
      expect(store.get(1)?.status).toBe('CONFIRMED');
      expect(store.get(2)?.status).toBe('EXPIRED');
      expect(recorded).toHaveLength(1);
    });

    it('correrlo dos veces no duplica estados ni auditorías (CA-44.5)', async () => {
      const { service, recorded } = setup([props(1)]);

      await service.run(now);
      const second = await service.run(now);

      expect(second).toEqual({ expired: 0, failures: [] });
      expect(recorded).toHaveLength(1);
    });

    it('si uno falla, sigue con los demás y lo informa', async () => {
      const { service, store, auditService } = setup([props(1), props(2)]);
      const boom = new Error('boom');
      (auditService.record as jest.Mock).mockRejectedValueOnce(boom);

      const result = await service.run(now);

      expect(result.expired).toBe(1);
      expect(result.failures).toEqual([{ redemptionId: 1, error: boom }]);
      expect(store.get(2)?.status).toBe('EXPIRED');
    });
  });

  describe('vencerVencidos(filtro): "vencer al leer" (CA-44.1)', () => {
    it('por código: vence solo ese canje, con FOR UPDATE que espera', async () => {
      const { service, store, lockCalls } = setup([props(1), props(2)]);

      const expired = await service.vencerVencidos({ code: 'K7MP2B' }, now);

      expect(expired).toBe(1);
      expect(lockCalls).toEqual([{ id: 1, mode: 'wait' }]);
      expect(store.get(1)?.status).toBe('EXPIRED');
      expect(store.get(2)?.status).toBe('CONFIRMED');
    });

    it('por cliente: vence solo los de ese cliente', async () => {
      const { service, store } = setup([props(1), props(2, { customerId: 999 })]);

      const expired = await service.vencerVencidos({ customerId: customer.id }, now);

      expect(expired).toBe(1);
      expect(store.get(1)?.status).toBe('EXPIRED');
      expect(store.get(2)?.status).toBe('CONFIRMED');
    });

    it('todos: vence todos los vencidos', async () => {
      const { service } = setup([props(1), props(2, { customerId: 999 })]);

      expect(await service.vencerVencidos({ all: true }, now)).toBe(2);
    });

    it('si el barrido ya lo venció mientras esperaba, no hace nada', async () => {
      const { service, store, repository, recorded } = setup([props(1)]);
      // Entre la búsqueda y el bloqueo, otro proceso lo venció
      (repository.lockForUpdate as jest.Mock).mockImplementationOnce(async (id: number) => {
        const row = store.get(id);
        return row ? Redemption.reconstruct({ ...row, status: 'EXPIRED', resolvedAt: expiresAt }) : null;
      });

      expect(await service.vencerVencidos({ code: 'K7MP2B' }, now)).toBe(0);
      expect(recorded).toHaveLength(0);
    });

    it('si un vencimiento falla, el error sube (quien lee no puede seguir)', async () => {
      const { service, auditService } = setup([props(1)]);
      (auditService.record as jest.Mock).mockRejectedValueOnce(new Error('boom'));

      await expect(service.vencerVencidos({ code: 'K7MP2B' }, now)).rejects.toThrow('boom');
    });
  });
});
