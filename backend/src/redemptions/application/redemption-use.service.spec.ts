import { ConflictException, NotFoundException } from '@nestjs/common';
import type { AuditService } from '../../audit/application/audit.service.js';
import { assertValidAuditEntry, type AuditEntryInput } from '../../audit/domain/audit-entry.js';
import type { EmployeesService } from '../../employees/application/employees.service.js';
import { InsufficientBalanceError } from '../../points/domain/errors/insufficient-balance.error.js';
import type { PointsService } from '../../points/application/points.service.js';
import type { RewardsAvailabilityService } from '../../rewards/application/rewards-availability.service.js';
import type { RewardsService } from '../../rewards/application/rewards.service.js';
import { Reward, type RewardProps } from '../../rewards/domain/reward.js';
import { Redemption, REDEMPTION_DURATION_MS, type RedemptionProps } from '../domain/redemption.js';
import type { RedemptionCustomer, RedemptionRepository } from '../domain/port/redemption.repository.js';
import type { TransactionRunner } from '../domain/port/transaction-runner.js';
import { RedemptionUseService } from './redemption-use.service.js';
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

function redemptionProps(overrides: Partial<RedemptionProps> = {}): RedemptionProps {
  return {
    id: 1,
    code: 'K7MP2X',
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

const rewardProps: RewardProps = {
  id: 20,
  name: 'Café + medialuna',
  description: null,
  points: 150,
  stock: 10,
  expiresAt: null,
  status: 'ACTIVE',
  disabledReason: null,
  usedCount: 0,
  createdAt: new Date('2026-10-01T12:00:00.000Z'),
  updatedAt: new Date('2026-10-01T12:00:00.000Z'),
  deletedAt: null,
};

const makeReward = (overrides: Partial<RewardProps> = {}) => Reward.reconstruct({ ...rewardProps, ...overrides });

function setup(
  options: {
    redemption?: RedemptionProps | null;
    reward?: Reward | null;
    customerActive?: boolean | null;
    expiredOnRead?: number;
    canjearResult?: { balanceBefore: number; balanceAfter: number };
    canjearError?: unknown;
  } = {},
) {
  const redemptionRow = 'redemption' in options ? options.redemption : redemptionProps();
  const rewardInstance = 'reward' in options ? options.reward : makeReward();
  const savedUse: Redemption[] = [];
  const recorded: AuditEntryInput[] = [];

  const redemptionRepository = {
    findByCode: jest.fn().mockResolvedValue(redemptionRow ? Redemption.reconstruct(redemptionRow) : null),
    lockByCodeForUpdate: jest.fn().mockResolvedValue(redemptionRow ? Redemption.reconstruct(redemptionRow) : null),
    findCustomerStatus: jest.fn().mockResolvedValue(
      options.customerActive === null ? null : { isActive: options.customerActive ?? true },
    ),
    findCustomer: jest.fn().mockResolvedValue(carolina),
    saveUse: jest.fn(async (redemption: Redemption) => {
      savedUse.push(redemption);
    }),
  } as unknown as RedemptionRepository;

  const rewardsService = {
    lockForUpdate: jest.fn().mockResolvedValue(rewardInstance),
    isAvailable: jest.fn(
      (r: Reward) => r.getStatus() === 'ACTIVE' && (r.getStock() === null || r.getStock()! > 0),
    ),
    recordUse: jest.fn(async (reward: Reward) => {
      reward.registerUse();
    }),
  } as unknown as RewardsService;

  // Aproxima la regla real (reward-reevaluation.ts): si se quedó sin stock, la deshabilita.
  const rewardsAvailabilityService = {
    reevaluarDisponibilidad: jest.fn(async (reward: Reward) => {
      if (reward.getStatus() === 'ACTIVE' && reward.getStock() !== null && reward.getStock()! <= 0) {
        reward.disable('OUT_OF_STOCK');
        return 'DISABLED';
      }
      return null;
    }),
  } as unknown as RewardsAvailabilityService;

  const pointsService = {
    canjear: jest.fn(async () => {
      if (options.canjearError) throw options.canjearError;
      return options.canjearResult ?? { balanceBefore: 1240, balanceAfter: 1090 };
    }),
  } as unknown as PointsService;

  const auditService = {
    record: jest.fn(async (entry: AuditEntryInput) => {
      assertValidAuditEntry(entry);
      recorded.push(entry);
    }),
  } as unknown as AuditService;

  const transactionRunner = {
    run: jest.fn(async <T>(fn: () => Promise<T>) => await fn()),
  } as unknown as TransactionRunner;

  const expiration = {
    vencerVencidos: jest.fn().mockResolvedValue(options.expiredOnRead ?? 0),
  } as unknown as RedemptionsExpirationService;

  const employeesService = {
    findById: jest.fn().mockResolvedValue({ getFirstName: () => 'Bruno', getLastName: () => 'Pérez' }),
  } as unknown as EmployeesService;

  const service = new RedemptionUseService(
    redemptionRepository,
    employeesService,
    rewardsService,
    rewardsAvailabilityService,
    pointsService,
    auditService,
    transactionRunner,
    expiration,
  );
  return { service, savedUse, recorded, redemptionRepository, rewardsService, pointsService, auditService, expiration };
}

const actor = { accountId: 4, employeeId: 9 };

describe('RedemptionUseService (US-42)', () => {
  it('CA-42.1: pasa a USED, descuenta stock, inserta el movimiento y audita REDEMPTION_USED', async () => {
    const { service, savedUse, recorded, rewardsService } = setup();

    const result = await service.use({ code: ' k7mp-2x ', actor }, now);

    expect(result.redemption.getStatus()).toBe('USED');
    expect(result.redemption.getResolvedByAccountId()).toBe(4);
    expect(result.redemption.getResolvedByName()).toBe('Bruno Pérez');
    expect(result.balanceBefore).toBe(1240);
    expect(result.balanceAfter).toBe(1090);
    expect(result.customer).toEqual(carolina);
    expect(savedUse).toHaveLength(1);
    expect(rewardsService.recordUse).toHaveBeenCalledTimes(1);
    expect(recorded).toEqual([
      expect.objectContaining({
        actor: { type: 'EMPLOYEE', accountId: 4 },
        module: 'REDEMPTIONS',
        action: 'REDEMPTION_USED',
        description: 'Registró el uso del canje de Carolina Fernández',
        details: [
          { label: 'Código del canje', value: 'K7MP2X' },
          { label: 'Recompensa', value: 'Café + medialuna' },
          { label: 'Puntos descontados', value: '−150 pts' },
          { label: 'Saldo resultante', value: '1.090 pts' },
        ],
      }),
    ]);
  });

  it('CA-42.3: última unidad: deshabilita la recompensa (vía RewardsAvailabilityService)', async () => {
    const { service, rewardsService } = setup({ reward: makeReward({ stock: 1 }) });

    await service.use({ code: 'K7MP2X', actor }, now);

    const usedReward = (rewardsService.recordUse as jest.Mock).mock.calls[0][0] as Reward;
    expect(usedReward.getStock()).toBe(0);
    expect(usedReward.getStatus()).toBe('DISABLED');
    expect(usedReward.getDisabledReason()).toBe('OUT_OF_STOCK');
  });

  it('código que no existe: 404 "Código no encontrado."', async () => {
    const { service } = setup({ redemption: null });

    const attempt = service.use({ code: 'ZZZZZZ', actor }, now);

    await expect(attempt).rejects.toBeInstanceOf(NotFoundException);
    await expect(attempt).rejects.toMatchObject({ message: 'Código no encontrado.' });
  });

  it('código mal escrito: 404, igual que inexistente, sin pegarle al repo', async () => {
    const { service, redemptionRepository } = setup();

    await expect(service.use({ code: 'con espacios de más', actor }, now)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(redemptionRepository.findByCode).not.toHaveBeenCalled();
  });

  it('vencido: vence al leer antes de abrir la transacción y responde 409 REDEMPTION_EXPIRED', async () => {
    const { service, expiration, redemptionRepository } = setup({ expiredOnRead: 1 });

    await expect(service.use({ code: 'K7MP2X', actor }, now)).rejects.toMatchObject({
      constructor: ConflictException,
      response: { code: 'REDEMPTION_EXPIRED', message: 'El canje venció. El cliente tiene que pedirlo de nuevo.' },
    });
    expect(expiration.vencerVencidos).toHaveBeenCalledWith({ code: 'K7MP2X' }, now);
    expect(redemptionRepository.lockByCodeForUpdate).not.toHaveBeenCalled();
  });

  it('ya usado: 409 REDEMPTION_NOT_CONFIRMED con el estado actual', async () => {
    const { service } = setup({ redemption: redemptionProps({ status: 'USED', resolvedAt: now }) });

    await expect(service.use({ code: 'K7MP2X', actor }, now)).rejects.toMatchObject({
      constructor: ConflictException,
      response: { code: 'REDEMPTION_NOT_CONFIRMED', message: 'El canje ya está en estado "Utilizado".' },
    });
  });

  it('cliente dado de baja: 409 CUSTOMER_INACTIVE', async () => {
    const { service } = setup({ customerActive: false });

    await expect(service.use({ code: 'K7MP2X', actor }, now)).rejects.toMatchObject({
      constructor: ConflictException,
      response: { code: 'CUSTOMER_INACTIVE', message: 'El cliente está dado de baja.' },
    });
  });

  it('CA-42.5: recompensa no disponible: 409 REWARD_NOT_AVAILABLE, con botón de rechazar', async () => {
    const { service, savedUse } = setup({ reward: makeReward({ status: 'INACTIVE' }) });

    await expect(service.use({ code: 'K7MP2X', actor }, now)).rejects.toMatchObject({
      constructor: ConflictException,
      response: {
        code: 'REWARD_NOT_AVAILABLE',
        message: 'La recompensa ya no está disponible. Podés rechazar el canje.',
      },
    });
    expect(savedUse).toEqual([]);
  });

  it('CA-42.4: saldo insuficiente: 409 INSUFFICIENT_BALANCE, el canje sigue CONFIRMED', async () => {
    const { service, savedUse } = setup({ canjearError: new InsufficientBalanceError() });

    await expect(service.use({ code: 'K7MP2X', actor }, now)).rejects.toMatchObject({
      constructor: ConflictException,
      response: {
        code: 'INSUFFICIENT_BALANCE',
        message: 'El cliente no tiene saldo suficiente para este canje. Podés rechazarlo.',
      },
    });
    expect(savedUse).toEqual([]);
  });

  it('CA-42.8: descuenta los puntos del canje (snapshot), no el precio actual de la recompensa', async () => {
    const { service, pointsService } = setup({
      redemption: redemptionProps({ points: 150 }),
      reward: makeReward({ points: 999 }),
    });

    await service.use({ code: 'K7MP2X', actor }, now);

    expect(pointsService.canjear).toHaveBeenCalledWith(expect.objectContaining({ points: 150, redemptionId: 1 }));
  });

  it('CA-42.7 (por diseño): el orden de bloqueos (recompensa → canje) evita el double-spend', async () => {
    const { service, rewardsService, redemptionRepository } = setup();

    await service.use({ code: 'K7MP2X', actor }, now);

    const rewardCallOrder = (rewardsService.lockForUpdate as jest.Mock).mock.invocationCallOrder[0];
    const redemptionCallOrder = (redemptionRepository.lockByCodeForUpdate as jest.Mock).mock.invocationCallOrder[0];
    expect(rewardCallOrder).toBeLessThan(redemptionCallOrder);
  });
});
