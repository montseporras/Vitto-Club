import { ConflictException, HttpException, NotFoundException } from '@nestjs/common';
import type { AuditService } from '../../audit/application/audit.service.js';
import { assertValidAuditEntry, type AuditEntryInput } from '../../audit/domain/audit-entry.js';
import type { EmployeesService } from '../../employees/application/employees.service.js';
import { Redemption, REDEMPTION_DURATION_MS, type RedemptionProps } from '../domain/redemption.js';
import type {
  AutomaticRejectionFilter,
  RedemptionCustomer,
  RedemptionRepository,
} from '../domain/port/redemption.repository.js';
import type { TransactionRunner } from '../domain/port/transaction-runner.js';
import {
  AUTOMATIC_REJECTION_REASONS,
  RedemptionResolutionService,
} from './redemption-resolution.service.js';
import type { RedemptionsExpirationService } from './redemptions-expiration.service.js';

const createdAt = new Date('2026-11-07T15:00:00.000Z');
const expiresAt = new Date(createdAt.getTime() + REDEMPTION_DURATION_MS);
const now = new Date(createdAt.getTime() + 5 * 60_000);

const carolina: RedemptionCustomer = {
  id: 101,
  firstName: 'Carolina',
  lastName: 'Fernández',
  documentType: 'DNI',
  documentNumber: '38456123',
};

function props(id: number, code: string, overrides: Partial<RedemptionProps> = {}): RedemptionProps {
  return {
    id,
    code,
    customerId: carolina.id,
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

// Repositorio en memoria y dobles del resto. expiredOnRead: cuántos vence el "vencer al leer".
function setup(rows: RedemptionProps[], options: { expiredOnRead?: number } = {}) {
  const store = new Map(rows.map((row) => [row.code, { ...row }]));
  const saved: Redemption[] = [];
  const recorded: AuditEntryInput[] = [];

  const repository = {
    findByCode: jest.fn(async (code: string) => {
      const row = store.get(code);
      return row ? Redemption.reconstruct(row) : null;
    }),
    lockByCodeForUpdate: jest.fn(async (code: string) => {
      const row = store.get(code);
      return row ? Redemption.reconstruct(row) : null;
    }),
    lockConfirmedForRejection: jest.fn(async (filter: AutomaticRejectionFilter, at: Date) =>
      [...store.values()]
        .filter((row) => row.status === 'CONFIRMED' && row.expiresAt.getTime() > at.getTime())
        .filter((row) => ('rewardId' in filter ? row.rewardId === filter.rewardId : row.customerId === filter.customerId))
        .map((row) => Redemption.reconstruct(row)),
    ),
    saveResolution: jest.fn(async (redemption: Redemption) => {
      saved.push(redemption);
    }),
    findCustomer: jest.fn(async () => carolina),
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

  const expiration = {
    vencerVencidos: jest.fn().mockResolvedValue(options.expiredOnRead ?? 0),
  } as unknown as RedemptionsExpirationService;

  const employeesService = {
    findById: jest.fn(async () => ({ getFirstName: () => 'Bruno', getLastName: () => 'Pérez' })),
  } as unknown as EmployeesService;

  const service = new RedemptionResolutionService(
    repository,
    transactionRunner,
    auditService,
    expiration,
    employeesService,
  );
  return { service, saved, recorded, repository, expiration, transactionRunner };
}

async function errorOf(promise: Promise<unknown>): Promise<HttpException> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof HttpException) return error;
    throw error;
  }
  throw new Error('expected an HttpException');
}

const bodyOf = (error: HttpException) => error.getResponse() as { message: string; code?: string };

const cashier = { accountId: 12, employeeId: 3 };

describe('RedemptionResolutionService (US-43)', () => {
  describe('reject (§3.10.1)', () => {
    it('CA-43.1: REJECTED con el motivo y el empleado; audita REDEMPTION_REJECTED a su nombre', async () => {
      const { service, saved, recorded } = setup([props(1, 'K7MP2X')]);

      const { redemption, customer } = await service.reject(
        { code: ' k7mp-2x ', reason: 'Sin insumo', actor: cashier },
        now,
      );

      expect(redemption.getStatus()).toBe('REJECTED');
      expect(redemption.getRejectionReason()).toBe('Sin insumo');
      expect(redemption.getResolvedAt()).toEqual(now);
      expect(redemption.getResolvedByAccountId()).toBe(12);
      expect(redemption.getResolvedByName()).toBe('Bruno Pérez');
      expect(customer).toEqual(carolina);
      expect(saved).toHaveLength(1);
      expect(recorded).toEqual([
        {
          actor: { type: 'EMPLOYEE', accountId: 12 },
          module: 'REDEMPTIONS',
          action: 'REDEMPTION_REJECTED',
          description: 'Rechazó el canje de Carolina Fernández',
          affectedCustomer: { customerId: 101, name: 'Carolina Fernández', documentType: 'DNI', documentNumber: '38456123' },
          operationCode: 'K7MP2X',
          details: [
            { label: 'Código del canje', value: 'K7MP2X' },
            { label: 'Recompensa', value: 'Café + medialuna' },
            { label: 'Motivo', value: 'Sin insumo' },
          ],
        },
      ]);
    });

    it('vence al leer con el código normalizado, antes de abrir la transacción', async () => {
      const { service, expiration, transactionRunner } = setup([props(1, 'K7MP2X')]);
      const order: string[] = [];
      (expiration.vencerVencidos as jest.Mock).mockImplementationOnce(async () => {
        order.push('vencer');
        return 0;
      });
      (transactionRunner.run as jest.Mock).mockImplementationOnce(async (fn: () => Promise<unknown>) => {
        order.push('transaction');
        return await fn();
      });

      await service.reject({ code: 'k7mp2x', reason: 'Sin insumo', actor: cashier }, now);

      expect(expiration.vencerVencidos).toHaveBeenCalledWith({ code: 'K7MP2X' }, now);
      expect(order).toEqual(['vencer', 'transaction']);
    });

    it.each(['', 'K7MP2', 'K7MP2O', 'ZZZZZZ'])('código "%s" mal escrito o inexistente → 404 "Código no encontrado."', async (code) => {
      const { service, recorded } = setup([props(1, 'K7MP2X')]);

      const error = await errorOf(service.reject({ code, reason: 'Sin insumo', actor: cashier }, now));

      expect(error).toBeInstanceOf(NotFoundException);
      expect(bodyOf(error).message).toBe('Código no encontrado.');
      expect(bodyOf(error).code).toBeUndefined();
      expect(recorded).toHaveLength(0);
    });

    it('CA-43.3: vencido → 409 REDEMPTION_EXPIRED (el vencimiento ya quedó guardado aparte)', async () => {
      const { service, saved, recorded } = setup([props(1, 'K7MP2X')], { expiredOnRead: 1 });

      const error = await errorOf(service.reject({ code: 'K7MP2X', reason: 'Sin insumo', actor: cashier }, expiresAt));

      expect(error).toBeInstanceOf(ConflictException);
      expect(bodyOf(error)).toEqual({ message: 'El canje venció. El cliente tiene que pedirlo de nuevo.', code: 'REDEMPTION_EXPIRED' });
      expect(saved).toHaveLength(0);
      expect(recorded).toHaveLength(0);
    });

    it.each([
      ['USED', 'Utilizado'],
      ['REJECTED', 'Rechazado'],
      ['CANCELLED', 'Cancelado'],
      ['EXPIRED', 'Vencido'],
    ] as const)('CA-43.3: ya %s → 409 REDEMPTION_NOT_CONFIRMED con "%s"', async (status, label) => {
      const { service, recorded } = setup([props(1, 'K7MP2X', { status, resolvedAt: createdAt })]);

      const error = await errorOf(service.reject({ code: 'K7MP2X', reason: 'Sin insumo', actor: cashier }, now));

      expect(bodyOf(error)).toEqual({
        message: `El canje ya está en estado "${label}".`,
        code: 'REDEMPTION_NOT_CONFIRMED',
      });
      expect(recorded).toHaveLength(0);
    });

    it('si venció entre el "vencer al leer" y el bloqueo: 409 REDEMPTION_EXPIRED y se vence aparte', async () => {
      const { service, expiration } = setup([props(1, 'K7MP2X')]);

      const error = await errorOf(service.reject({ code: 'K7MP2X', reason: 'Sin insumo', actor: cashier }, expiresAt));

      expect(bodyOf(error).code).toBe('REDEMPTION_EXPIRED');
      expect(expiration.vencerVencidos).toHaveBeenCalledTimes(2);
    });
  });

  describe('cancel (§3.10.3)', () => {
    it('CA-43.4: el propio pasa a CANCELLED, sin resolvedBy y sin auditoría', async () => {
      const { service, saved, recorded } = setup([props(1, 'K7MP2X')]);

      const redemption = await service.cancel({ code: 'K7MP2X', customerId: carolina.id }, now);

      expect(redemption.getStatus()).toBe('CANCELLED');
      expect(redemption.getResolvedAt()).toEqual(now);
      expect(redemption.getResolvedByAccountId()).toBeNull();
      expect(redemption.getResolvedByName()).toBeNull();
      expect(saved).toHaveLength(1);
      expect(recorded).toHaveLength(0);
    });

    it('CA-43.5: el de otro cliente → 404 "No existe el canje." y no vence nada', async () => {
      const { service, expiration, saved } = setup([props(1, 'K7MP2X')]);

      const error = await errorOf(service.cancel({ code: 'K7MP2X', customerId: 999 }, now));

      expect(error).toBeInstanceOf(NotFoundException);
      expect(bodyOf(error).message).toBe('No existe el canje.');
      expect(expiration.vencerVencidos).not.toHaveBeenCalled();
      expect(saved).toHaveLength(0);
    });

    it.each(['ZZZZZZ', 'K7MP'])('código "%s" inexistente o mal escrito → 404 "No existe el canje."', async (code) => {
      const { service } = setup([props(1, 'K7MP2X')]);

      const error = await errorOf(service.cancel({ code, customerId: carolina.id }, now));

      expect(bodyOf(error).message).toBe('No existe el canje.');
    });

    it('CA-43.6: vencido → 409 REDEMPTION_EXPIRED "El canje ya venció."', async () => {
      const { service } = setup([props(1, 'K7MP2X')], { expiredOnRead: 1 });

      const error = await errorOf(service.cancel({ code: 'K7MP2X', customerId: carolina.id }, expiresAt));

      expect(bodyOf(error)).toEqual({ message: 'El canje ya venció.', code: 'REDEMPTION_EXPIRED' });
    });

    it('CA-43.6: resuelto → 409 REDEMPTION_NOT_CONFIRMED "El canje ya no se puede cancelar."', async () => {
      const { service } = setup([props(1, 'K7MP2X', { status: 'USED', resolvedAt: createdAt, balanceBefore: 1, balanceAfter: 0 })]);

      const error = await errorOf(service.cancel({ code: 'K7MP2X', customerId: carolina.id }, now));

      expect(bodyOf(error)).toEqual({ message: 'El canje ya no se puede cancelar.', code: 'REDEMPTION_NOT_CONFIRMED' });
    });
  });

  describe('rechazarConfirmados (§3.10.4, CA-43.7)', () => {
    it('rechaza los Confirmados vigentes de la recompensa como Sistema y audita cada uno', async () => {
      const { service, saved, recorded, expiration } = setup([
        props(1, 'AAAAAA'),
        props(2, 'BBBBBB'),
        props(3, 'CCCCCC', { rewardId: 99 }),
        props(4, 'DDDDDD', { status: 'USED', resolvedAt: createdAt, balanceBefore: 1, balanceAfter: 0 }),
      ]);

      const rejected = await service.rechazarConfirmados(
        { rewardId: 20 },
        AUTOMATIC_REJECTION_REASONS.rewardDeactivated,
        now,
      );

      expect(rejected).toBe(2);
      expect(expiration.vencerVencidos).toHaveBeenCalledWith({ rewardId: 20 }, now);
      expect(saved.map((r) => [r.getCode(), r.getStatus(), r.getRejectionReason(), r.getResolvedByAccountId(), r.getResolvedByName()])).toEqual([
        ['AAAAAA', 'REJECTED', 'Recompensa desactivada', null, 'Sistema'],
        ['BBBBBB', 'REJECTED', 'Recompensa desactivada', null, 'Sistema'],
      ]);
      expect(recorded).toHaveLength(2);
      expect(recorded[0]).toMatchObject({
        actor: { type: 'SYSTEM' },
        action: 'REDEMPTION_REJECTED',
        operationCode: 'AAAAAA',
        details: [
          { label: 'Código del canje', value: 'AAAAAA' },
          { label: 'Recompensa', value: 'Café + medialuna' },
          { label: 'Motivo', value: 'Recompensa desactivada' },
        ],
      });
    });

    it('por cliente, con el motivo "Cliente dado de baja"', async () => {
      const { service, saved } = setup([props(1, 'AAAAAA'), props(2, 'BBBBBB', { customerId: 999 })]);

      const rejected = await service.rechazarConfirmados(
        { customerId: carolina.id },
        AUTOMATIC_REJECTION_REASONS.customerDeactivated,
        now,
      );

      expect(rejected).toBe(1);
      expect(saved[0].getRejectionReason()).toBe('Cliente dado de baja');
    });

    it('sin Confirmados devuelve 0 y no audita', async () => {
      const { service, recorded } = setup([]);

      expect(await service.rechazarConfirmados({ rewardId: 20 }, 'Recompensa eliminada', now)).toBe(0);
      expect(recorded).toHaveLength(0);
    });

    it('los motivos del contrato', () => {
      expect(AUTOMATIC_REJECTION_REASONS).toEqual({
        rewardDeactivated: 'Recompensa desactivada',
        rewardDeleted: 'Recompensa eliminada',
        customerDeactivated: 'Cliente dado de baja',
      });
    });
  });
});
