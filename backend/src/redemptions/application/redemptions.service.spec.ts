import { ConflictException, NotFoundException } from '@nestjs/common';
import type { AuditService } from '../../audit/application/audit.service.js';
import type { CustomersService } from '../../customers/application/customers.service.js';
import type { Customer } from '../../customers/domain/customer.js';
import type { EmployeesService } from '../../employees/application/employees.service.js';
import type { RewardsService } from '../../rewards/application/rewards.service.js';
import { Reward, type RewardProps } from '../../rewards/domain/reward.js';
import type { NewRedemption } from '../domain/new-redemption.js';
import type { RedemptionRepository } from '../domain/port/redemption.repository.js';
import type { TransactionRunner } from '../domain/port/transaction-runner.js';
import { Redemption } from '../domain/redemption.js';
import { RedemptionsService } from './redemptions.service.js';

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

const makeCustomer = (active = true) =>
  ({
    getId: () => 102,
    getFirstName: () => 'Sofía',
    getLastName: () => 'Ríos',
    getDocumentType: () => 'DNI',
    getDocumentNumber: () => '30111222',
    isActive: () => active,
  }) as unknown as Customer;

function setup(options: { customer?: Customer; reward?: Reward | null; available?: boolean } = {}) {
  const created: NewRedemption[] = [];
  const redemptionRepository = {
    existsByCode: jest.fn().mockResolvedValue(false),
    findByCode: jest.fn(),
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
  };
  const customersService = { findById: jest.fn().mockResolvedValue(options.customer ?? makeCustomer()) };
  const employeesService = {
    findById: jest.fn().mockResolvedValue({ getFirstName: () => 'Diego', getLastName: () => 'Sosa' }),
  };
  const rewardsService = {
    findById: jest.fn().mockResolvedValue('reward' in options ? options.reward : makeReward()),
    isAvailable: jest.fn().mockReturnValue(options.available ?? true),
  };
  const auditService = { record: jest.fn().mockResolvedValue(undefined) };
  const transactionRunner = { run: jest.fn(async (work: () => Promise<unknown>) => await work()) };

  const service = new RedemptionsService(
    redemptionRepository as unknown as RedemptionRepository,
    customersService as unknown as CustomersService,
    employeesService as unknown as EmployeesService,
    rewardsService as unknown as RewardsService,
    auditService as unknown as AuditService,
    transactionRunner as unknown as TransactionRunner,
  );
  return { service, created, redemptionRepository, auditService, employeesService, transactionRunner };
}

describe('RedemptionsService.confirm (US-40)', () => {
  it('desde la app: guarda un canje APP con el snapshot, sin empleado y sin auditar (CA-40.1, CA-40.5)', async () => {
    const { service, created, auditService, employeesService } = setup();

    const redemption = await service.confirm({ customerId: 102, rewardId: 6, confirmedBy: null });

    expect(redemption.getStatus()).toBe('CONFIRMED');
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

  it('corre todo dentro de la transacción ambiente', async () => {
    const { service, transactionRunner } = setup();

    await service.confirm({ customerId: 102, rewardId: 6, confirmedBy: null });

    expect(transactionRunner.run).toHaveBeenCalledTimes(1);
  });

  it('cliente dado de baja: 409 CUSTOMER_INACTIVE y no guarda nada (CA-40.4)', async () => {
    const { service, created, auditService } = setup({ customer: makeCustomer(false) });

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

  it('recompensa no disponible: 409 REWARD_NOT_AVAILABLE (CA-40.3)', async () => {
    const { service, created, auditService } = setup({ available: false });

    await expect(
      service.confirm({ customerId: 102, rewardId: 6, confirmedBy: { accountId: 4, employeeId: 9 } }),
    ).rejects.toMatchObject({
      constructor: ConflictException,
      response: { code: 'REWARD_NOT_AVAILABLE', message: 'La recompensa ya no está disponible.' },
    });
    expect(created).toEqual([]);
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('no valida el saldo: el servicio ni lo consulta (CA-40.2, decisión S4-2)', async () => {
    // RedemptionsService no recibe PointsService: confirmar no puede mirar ni mover puntos
    const { service } = setup();

    await expect(service.confirm({ customerId: 102, rewardId: 6, confirmedBy: null })).resolves.toBeDefined();
  });
});
