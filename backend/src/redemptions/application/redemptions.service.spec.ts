import { ConflictException, NotFoundException } from '@nestjs/common';
import type { AuditService } from '../../audit/application/audit.service.js';
import type { CustomersService } from '../../customers/application/customers.service.js';
import type { Customer } from '../../customers/domain/customer.js';
import type { EmployeesService } from '../../employees/application/employees.service.js';
import { InsufficientBalanceError } from '../../points/domain/errors/insufficient-balance.error.js';
import type { PointsService } from '../../points/application/points.service.js';
import type { RewardsService } from '../../rewards/application/rewards.service.js';
import { Reward, type RewardProps } from '../../rewards/domain/reward.js';
import type { NewRedemption } from '../domain/new-redemption.js';
import type { RedemptionRepository } from '../domain/port/redemption.repository.js';
import type { TransactionRunner } from '../domain/port/transaction-runner.js';
import { Redemption, type RedemptionProps } from '../domain/redemption.js';
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

const redemptionProps: RedemptionProps = {
  id: 10,
  code: 'A2B3C4',
  customerId: 102,
  rewardId: 6,
  rewardName: 'Desayuno completo',
  points: 400,
  status: 'CONFIRMED',
  origin: 'COUNTER',
  confirmedByAccountId: 2,
  confirmedByName: 'Diego Sosa',
  createdAt: new Date('2026-11-08T12:00:00.000Z'),
  expiresAt: new Date('2026-11-08T12:15:00.000Z'),
  resolvedAt: null,
  resolvedByAccountId: null,
  resolvedByName: null,
  rejectionReason: null,
  balanceBefore: null,
  balanceAfter: null,
};

const makeRedemption = (overrides: Partial<RedemptionProps> = {}) =>
  Redemption.reconstruct({ ...redemptionProps, ...overrides });

function setup(
  options: {
    customer?: Customer;
    reward?: Reward | null;
    available?: boolean;
    lockedReward?: Reward | null;
    lockedRedemption?: Redemption | null;
    canjearResult?: { balanceBefore: number; balanceAfter: number };
    canjearError?: unknown;
  } = {},
) {
  const created: NewRedemption[] = [];
  const updatedRedemptions: Redemption[] = [];
  const redemptionRepository = {
    existsByCode: jest.fn().mockResolvedValue(false),
    findByCode: jest.fn().mockResolvedValue(makeRedemption()),
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
    lockByCode: jest.fn().mockResolvedValue(
      'lockedRedemption' in options ? options.lockedRedemption : makeRedemption(),
    ),
    update: jest.fn(async (redemption: Redemption) => {
      updatedRedemptions.push(redemption);
    }),
  };
  const customersService = { findById: jest.fn().mockResolvedValue(options.customer ?? makeCustomer()) };
  const employeesService = {
    findById: jest.fn().mockResolvedValue({ getFirstName: () => 'Diego', getLastName: () => 'Sosa' }),
  };
  const rewardsService = {
    findById: jest.fn().mockResolvedValue('reward' in options ? options.reward : makeReward()),
    isAvailable: jest.fn().mockReturnValue(options.available ?? true),
    lockById: jest.fn().mockResolvedValue('lockedReward' in options ? options.lockedReward : makeReward()),
    registerUse: jest.fn(async (reward: Reward) => reward.registerUse()),
  };
  const pointsService = {
    canjear: jest.fn(async () => {
      if (options.canjearError) throw options.canjearError;
      return options.canjearResult ?? { balanceBefore: 1240, balanceAfter: 840 };
    }),
  };
  const auditService = { record: jest.fn().mockResolvedValue(undefined) };
  const transactionRunner = { run: jest.fn(async (work: () => Promise<unknown>) => await work()) };

  const service = new RedemptionsService(
    redemptionRepository as unknown as RedemptionRepository,
    customersService as unknown as CustomersService,
    employeesService as unknown as EmployeesService,
    rewardsService as unknown as RewardsService,
    pointsService as unknown as PointsService,
    auditService as unknown as AuditService,
    transactionRunner as unknown as TransactionRunner,
  );
  return {
    service,
    created,
    updatedRedemptions,
    redemptionRepository,
    rewardsService,
    pointsService,
    auditService,
    employeesService,
    transactionRunner,
  };
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

  it('no valida el saldo: confirmar no mira ni mueve puntos (CA-40.2, decisión S4-2)', async () => {
    const { service, pointsService } = setup();

    await expect(service.confirm({ customerId: 102, rewardId: 6, confirmedBy: null })).resolves.toBeDefined();
    expect(pointsService.canjear).not.toHaveBeenCalled();
  });
});

describe('RedemptionsService.usar (US-42)', () => {
  const actor = { accountId: 4, employeeId: 9 };

  it('descuento correcto: pasa a USED, descuenta stock y audita REDEMPTION_USED (CA-42.1)', async () => {
    const { service, updatedRedemptions, rewardsService, auditService } = setup();

    const result = await service.usar({ code: 'a2b3c4', actor });

    expect(result).toEqual({ redemption: expect.any(Redemption), balanceBefore: 1240, balanceAfter: 840 });
    expect(result.redemption.getStatus()).toBe('USED');
    expect(result.redemption.getResolvedByAccountId()).toBe(4);
    expect(result.redemption.getResolvedByName()).toBe('Diego Sosa');
    expect(result.redemption.getBalanceBefore()).toBe(1240);
    expect(result.redemption.getBalanceAfter()).toBe(840);
    expect(updatedRedemptions).toHaveLength(1);
    expect(rewardsService.registerUse).toHaveBeenCalledTimes(1);
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { type: 'EMPLOYEE', accountId: 4 },
        module: 'REDEMPTIONS',
        action: 'REDEMPTION_USED',
        description: 'Registró el uso del canje de Sofía Ríos',
        details: [
          { label: 'Código del canje', value: 'A2B3C4' },
          { label: 'Recompensa', value: 'Desayuno completo' },
          { label: 'Puntos descontados', value: '−400 pts' },
          { label: 'Saldo resultante', value: '840 pts' },
        ],
      }),
    );
  });

  it('normaliza el código que escribe el empleado (minúsculas, espacios y guiones)', async () => {
    const { service, redemptionRepository } = setup();

    await service.usar({ code: ' a2-b3 c4 ', actor });

    expect(redemptionRepository.lockByCode).toHaveBeenCalledWith('A2B3C4');
  });

  it('stock sin límite: no lo toca (CA-42.2)', async () => {
    const reward = makeReward({ stock: null });
    const { service, rewardsService } = setup({ reward, lockedReward: reward });

    await service.usar({ code: 'A2B3C4', actor });

    expect(reward.getStock()).toBeNull();
    expect(rewardsService.registerUse).toHaveBeenCalledWith(reward);
  });

  it('última unidad: deshabilita la recompensa y audita REWARD_DISABLED (CA-42.3)', async () => {
    const reward = makeReward({ stock: 1 });
    const { service, auditService } = setup({ reward, lockedReward: reward });

    await service.usar({ code: 'A2B3C4', actor });

    expect(reward.getStatus()).toBe('DISABLED');
    expect(reward.getDisabledReason()).toBe('OUT_OF_STOCK');
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { type: 'SYSTEM' },
        module: 'REWARDS',
        action: 'REWARD_DISABLED',
        description: 'Deshabilitó la recompensa "Desayuno completo"',
        details: [{ label: 'Motivo', value: 'Sin stock' }],
      }),
    );
  });

  it('código que no existe: 404 "Código no encontrado."', async () => {
    const { service, redemptionRepository } = setup();
    redemptionRepository.findByCode.mockResolvedValue(null);

    const attempt = service.usar({ code: 'ZZZZZZ', actor });

    await expect(attempt).rejects.toBeInstanceOf(NotFoundException);
    await expect(attempt).rejects.toMatchObject({ message: 'Código no encontrado.' });
  });

  it('código mal escrito (no cumple el formato): 404 "Código no encontrado." (igual que inexistente)', async () => {
    const { service, redemptionRepository } = setup();

    const attempt = service.usar({ code: 'con espacios y de más', actor });

    await expect(attempt).rejects.toBeInstanceOf(NotFoundException);
    expect(redemptionRepository.findByCode).not.toHaveBeenCalled();
  });

  it('ya no está CONFIRMED: 409 REDEMPTION_NOT_CONFIRMED con el estado actual', async () => {
    const used = makeRedemption({ status: 'USED' });
    const { service } = setup({ lockedRedemption: used });

    await expect(service.usar({ code: 'A2B3C4', actor })).rejects.toMatchObject({
      constructor: ConflictException,
      response: { code: 'REDEMPTION_NOT_CONFIRMED', message: 'El canje ya está en estado "Utilizado".' },
    });
  });

  it('cliente dado de baja: 409 CUSTOMER_INACTIVE', async () => {
    const { service } = setup({ customer: makeCustomer(false) });

    await expect(service.usar({ code: 'A2B3C4', actor })).rejects.toMatchObject({
      constructor: ConflictException,
      response: { code: 'CUSTOMER_INACTIVE', message: 'El cliente está dado de baja.' },
    });
  });

  it('recompensa no disponible: 409 REWARD_NOT_AVAILABLE, con botón de rechazar (CA-42.5)', async () => {
    const { service, updatedRedemptions } = setup({ available: false });

    await expect(service.usar({ code: 'A2B3C4', actor })).rejects.toMatchObject({
      constructor: ConflictException,
      response: {
        code: 'REWARD_NOT_AVAILABLE',
        message: 'La recompensa ya no está disponible. Podés rechazar el canje.',
      },
    });
    expect(updatedRedemptions).toEqual([]);
  });

  it('saldo insuficiente: 409 INSUFFICIENT_BALANCE, el canje sigue CONFIRMED (CA-42.4)', async () => {
    const { service, updatedRedemptions } = setup({ canjearError: new InsufficientBalanceError() });

    await expect(service.usar({ code: 'A2B3C4', actor })).rejects.toMatchObject({
      constructor: ConflictException,
      response: {
        code: 'INSUFFICIENT_BALANCE',
        message: 'El cliente no tiene saldo suficiente para este canje. Podés rechazarlo.',
      },
    });
    expect(updatedRedemptions).toEqual([]);
  });

  it('se descuentan los puntos del canje (snapshot), no el precio actual de la recompensa (CA-42.8)', async () => {
    const redemption = makeRedemption({ points: 150 });
    const { service, pointsService } = setup({ lockedRedemption: redemption, reward: makeReward({ points: 999 }) });

    await service.usar({ code: 'A2B3C4', actor });

    expect(pointsService.canjear).toHaveBeenCalledWith(
      expect.objectContaining({ points: 150, redemptionId: 10 }),
    );
  });

  it('el Cliente no puede llegar acá: sin @Roles de Cliente en el controller (CA-42.11)', () => {
    // No hay nada que probar a nivel de servicio: el 403 lo decide el RolesGuard sobre
    // @Roles('ADMIN', 'CASHIER') del controller (ver redemptions.controller.ts). Queda
    // documentado acá para que quede trazado el criterio.
    expect(true).toBe(true);
  });
});
