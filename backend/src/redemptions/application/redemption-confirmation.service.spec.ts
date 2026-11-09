import { ConflictException, NotFoundException } from '@nestjs/common';
import type { AuditService } from '../../audit/application/audit.service.js';
import type { EmployeesService } from '../../employees/application/employees.service.js';
import type { RewardsService } from '../../rewards/application/rewards.service.js';
import { Reward, type RewardProps } from '../../rewards/domain/reward.js';
import type { NewRedemption } from '../domain/new-redemption.js';
import type { RedemptionCustomer, RedemptionRepository } from '../domain/port/redemption.repository.js';
import type { TransactionRunner } from '../domain/port/transaction-runner.js';
import { Redemption } from '../domain/redemption.js';
import { RedemptionConfirmationService } from './redemption-confirmation.service.js';

const sofia: RedemptionCustomer = {
  id: 102,
  firstName: 'Sofía',
  lastName: 'Ríos',
  documentType: 'DNI',
  documentNumber: '30111222',
};

const rewardProps: RewardProps = {
  id: 6,
  name: 'Desayuno completo',
  description: null,
  points: 400,
  stock: 10,
  expiresAt: null,
  status: 'ACTIVE',
  disabledReason: null,
  usedCount: 0,
  createdAt: new Date('2026-11-01T12:00:00.000Z'),
  updatedAt: new Date('2026-11-01T12:00:00.000Z'),
  deletedAt: null,
};

const makeReward = (overrides: Partial<RewardProps> = {}) => Reward.reconstruct({ ...rewardProps, ...overrides });

function setup(
  options: { customerActive?: boolean | null; reward?: Reward | null } = {},
) {
  const created: NewRedemption[] = [];
  const redemptionRepository = {
    existsByCode: jest.fn().mockResolvedValue(false),
    findCustomerStatus: jest.fn().mockResolvedValue(
      options.customerActive === null ? null : { isActive: options.customerActive ?? true },
    ),
    findCustomer: jest.fn().mockResolvedValue(sofia),
    create: jest.fn(async (data: NewRedemption) => {
      created.push(data);
      return Redemption.reconstruct({
        id: 1,
        ...data,
        status: 'CONFIRMED',
        resolvedAt: null,
        resolvedByAccountId: null,
        resolvedByName: null,
        rejectionReason: null,
        balanceBefore: null,
        balanceAfter: null,
      });
    }),
  } as unknown as RedemptionRepository;

  const employeesService = {
    findById: jest.fn().mockResolvedValue({ getFirstName: () => 'Diego', getLastName: () => 'Sosa' }),
  } as unknown as EmployeesService;

  const reward = 'reward' in options ? options.reward : makeReward();
  const rewardsService = {
    findById: jest.fn().mockResolvedValue(reward),
    isAvailable: jest.fn((r: Reward) => r.getStatus() === 'ACTIVE' && (r.getStock() === null || r.getStock()! > 0)),
  } as unknown as RewardsService;

  const auditService = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
  const transactionRunner = {
    run: jest.fn(async <T>(fn: () => Promise<T>) => await fn()),
  } as unknown as TransactionRunner;

  const service = new RedemptionConfirmationService(
    redemptionRepository,
    employeesService,
    rewardsService,
    auditService,
    transactionRunner,
  );
  return { service, created, redemptionRepository, auditService, employeesService };
}

describe('RedemptionConfirmationService (US-40)', () => {
  it('desde la app: guarda un canje APP con el snapshot, sin empleado y sin auditar (CA-40.1, CA-40.5)', async () => {
    const { service, created, auditService, employeesService } = setup();

    const { redemption, customer } = await service.confirm({ customerId: 102, rewardId: 6, confirmedBy: null });

    expect(redemption.getStatus()).toBe('CONFIRMED');
    expect(customer).toEqual(sofia);
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      customerId: 102,
      rewardId: 6,
      rewardName: 'Desayuno completo',
      points: 400,
      origin: 'APP',
      confirmedByAccountId: null,
      confirmedByName: null,
    });
    expect(created[0].code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(created[0].expiresAt.getTime() - created[0].createdAt.getTime()).toBe(15 * 60 * 1000);
    expect(employeesService.findById).not.toHaveBeenCalled();
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('desde la caja: guarda COUNTER con el empleado y audita REDEMPTION_CONFIRMED a su nombre (CA-40.5)', async () => {
    const { service, created, auditService } = setup();

    await service.confirm({ customerId: 102, rewardId: 6, confirmedBy: { accountId: 4, employeeId: 9 } });

    expect(created[0]).toMatchObject({ origin: 'COUNTER', confirmedByAccountId: 4, confirmedByName: 'Diego Sosa' });
    expect(auditService.record).toHaveBeenCalledTimes(1);
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { type: 'EMPLOYEE', accountId: 4 },
        module: 'REDEMPTIONS',
        action: 'REDEMPTION_CONFIRMED',
        description: 'Confirmó el canje de Sofía Ríos',
      }),
    );
  });

  it('cliente que no existe: 404', async () => {
    const { service, created } = setup({ customerActive: null });

    await expect(
      service.confirm({ customerId: 102, rewardId: 6, confirmedBy: null }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(created).toEqual([]);
  });

  it('cliente dado de baja: 409 CUSTOMER_INACTIVE y no guarda nada (CA-40.4)', async () => {
    const { service, created, auditService } = setup({ customerActive: false });

    await expect(
      service.confirm({ customerId: 102, rewardId: 6, confirmedBy: { accountId: 4, employeeId: 9 } }),
    ).rejects.toMatchObject({
      constructor: ConflictException,
      response: { code: 'CUSTOMER_INACTIVE', message: 'El cliente está dado de baja.' },
    });
    expect(created).toEqual([]);
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it.each([
    ['no existe', null],
    ['está dada de baja', makeReward({ status: 'DELETED', deletedAt: new Date() })],
  ])('recompensa que %s: 404 "No existe la recompensa." (CA-40.3, CA-40.11)', async (_name, reward) => {
    const { service, created } = setup({ reward });

    const attempt = service.confirm({ customerId: 102, rewardId: 6, confirmedBy: null });

    await expect(attempt).rejects.toBeInstanceOf(NotFoundException);
    await expect(attempt).rejects.toMatchObject({ message: 'No existe la recompensa.' });
    expect(created).toEqual([]);
  });

  it('recompensa no disponible (DISABLED/INACTIVE): 409 REWARD_NOT_AVAILABLE (CA-40.3)', async () => {
    const { service, created, auditService } = setup({ reward: makeReward({ status: 'INACTIVE' }) });

    await expect(
      service.confirm({ customerId: 102, rewardId: 6, confirmedBy: { accountId: 4, employeeId: 9 } }),
    ).rejects.toMatchObject({
      constructor: ConflictException,
      response: { code: 'REWARD_NOT_AVAILABLE', message: 'La recompensa ya no está disponible.' },
    });
    expect(created).toEqual([]);
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('no valida el saldo: confirmar no mira ni mueve puntos (CA-40.2, decisión S4-2)', async () => {
    const { service } = setup();

    await expect(service.confirm({ customerId: 102, rewardId: 6, confirmedBy: null })).resolves.toBeDefined();
  });
});
