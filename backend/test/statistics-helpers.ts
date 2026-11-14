import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { AccessTokenIssuer } from '../src/auth/domain/port/access-token-issuer.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { argentinaMonthStart, toArgentinaParts } from '../src/shared/time/argentina-date.js';
import { deletePointsMovements } from './delete-points-movements.js';

// Helpers de los e2e de estadísticas (US-51 a US-55): la app con el header `x-test-auth-role` para entrar como
// cada rol, y la siembra de datos con fechas controladas (las estadísticas dependen de ellas).

export type Role = 'ADMIN' | 'CASHIER' | 'CUSTOMER';

export type StatisticsTestApp = {
  app: INestApplication<App>;
  prisma: PrismaService;
  // Para fijar quién es el actor; se completa con `resetDatabase()`
  actor: { accountId: number; employeeId: number };
  resetDatabase: () => Promise<void>;
  close: () => Promise<void>;
};

export const asAdmin = { 'x-test-auth-role': 'ADMIN' };
export const asCashier = { 'x-test-auth-role': 'CASHIER' };
export const asCustomer = { 'x-test-auth-role': 'CUSTOMER' };

export async function createStatisticsApp(): Promise<StatisticsTestApp> {
  const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  // Igual que main.ts
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  const actor = { accountId: 0, employeeId: 0 };
  let customerAccountId = 0;
  let customerId = 0;
  const issuer = moduleFixture.get(AccessTokenIssuer, { strict: false });
  app.use(async (req: Request, _res: Response, next: NextFunction) => {
    const role = req.header('x-test-auth-role');
    if (role === 'ADMIN' || role === 'CASHIER') {
      const token = await issuer.issue({ accountId: actor.accountId, role, employeeId: actor.employeeId });
      req.headers.authorization = `Bearer ${token}`;
    } else if (role === 'CUSTOMER') {
      const token = await issuer.issue({ accountId: customerAccountId, role: 'CUSTOMER', customerId });
      req.headers.authorization = `Bearer ${token}`;
    }
    next();
  });
  await app.init();
  const prisma = app.get(PrismaService);

  const cleanDatabase = async () => {
    await deletePointsMovements(prisma);
    await prisma.redemption.deleteMany();
    await prisma.reward.deleteMany();
    await prisma.customerMission.deleteMany();
    await prisma.mission.deleteMany();
    await prisma.pointsLot.deleteMany();
    await prisma.customerPoints.deleteMany();
    await prisma.consumption.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.customerStatusChange.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.loyaltyProgramConfiguration.deleteMany();
  };

  return {
    app,
    prisma,
    actor,
    // Deja la base vacía y crea el Administrador (actor), un cliente con cuenta (para el token de Cliente) y la
    // versión 1 de la configuración (1000 = 10 pts)
    resetDatabase: async () => {
      await cleanDatabase();
      const employee = await prisma.employee.create({
        data: { firstName: 'Ana', lastName: 'Gómez', phone: '3510000000', email: 'admin.stats@vitto.club', role: 'ADMIN', isActive: true },
      });
      const account = await prisma.account.create({
        data: { email: employee.email, passwordHash: 'x', role: 'ADMIN', isActive: true, employeeId: employee.id },
      });
      actor.employeeId = employee.id;
      actor.accountId = account.id;

      const customer = await prisma.customer.create({
        data: { firstName: 'Cora', lastName: 'Cliente', documentType: 'DNI', documentNumber: '10000001', email: 'cora.stats@vitto.club' },
      });
      const customerAccount = await prisma.account.create({
        data: { email: customer.email, passwordHash: 'x', role: 'CUSTOMER', isActive: true, customerId: customer.id },
      });
      customerId = customer.id;
      customerAccountId = customerAccount.id;

      await prisma.loyaltyProgramConfiguration.create({
        data: { version: 1, baseAmount: 1000, pointsAwarded: 10, pointsExpirationMonths: 12, isActive: true },
      });
    },
    close: async () => {
      await cleanDatabase();
      await app.close();
    },
  };
}

// --- Fechas ---------------------------------------------------------------------------------------------

// Un instante en hora de Argentina: art(2026, 10, 15, 14, 30) = 15/10/2026 14:30
export const art = (year: number, month: number, day: number, hour = 12, minute = 0): Date =>
  new Date(Date.UTC(year, month - 1, day, hour + 3, minute));

// El mes en curso y los anteriores, en hora de Argentina: monthAgo(0) = este mes, monthAgo(1) = el anterior…
export function monthAgo(back: number, now: Date = new Date()): { year: number; month: number; value: string; lastDay: number } {
  const today = toArgentinaParts(now);
  const index = today.year * 12 + (today.month - 1) - back;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return {
    year,
    month,
    value: `${year}-${String(month).padStart(2, '0')}`,
    lastDay: new Date(Date.UTC(year, month, 0)).getUTCDate(),
  };
}

export const startOfMonth = (year: number, month: number): Date => argentinaMonthStart(year, month);

// --- Siembra --------------------------------------------------------------------------------------------

let counter = 0;
const unique = (): number => ++counter;

// Código de canje válido y único: 6 caracteres sin 0, O, 1 ni I (CHECK redemptions_code_format_check)
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function redemptionCode(n: number): string {
  let code = '';
  let rest = n;
  for (let i = 0; i < 6; i++) {
    code = CODE_ALPHABET[rest % 32] + code;
    rest = Math.floor(rest / 32);
  }
  return code;
}

export class StatisticsSeeder {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actor: { accountId: number },
  ) {}

  async customer(
    options: { createdAt?: Date; deactivatedAt?: Date | null; lifetimePoints?: number } = {},
  ): Promise<number> {
    const n = unique();
    const customer = await this.prisma.customer.create({
      data: {
        firstName: `Cliente${n}`,
        lastName: 'Prueba',
        documentType: 'DNI',
        documentNumber: String(20000000 + n),
        email: `cliente${n}.stats@vitto.club`,
        createdAt: options.createdAt,
        isActive: !options.deactivatedAt,
        deactivatedAt: options.deactivatedAt ?? null,
      },
    });
    if (options.lifetimePoints !== undefined) {
      await this.prisma.customerPoints.create({
        data: { customerId: customer.id, balance: options.lifetimePoints, lifetimePoints: options.lifetimePoints },
      });
    }
    return customer.id;
  }

  // Un consumo REGISTERED con su movimiento CONSUMPTION_CREDIT por el total (puntos + bonificación), igual que
  // lo deja POST /consumos. Con `voidedAt` queda anulado y con su VOID_REVERSAL.
  async consumption(options: {
    customerId: number;
    createdAt: Date;
    amount?: number;
    points?: number;
    bonusPoints?: number;
    voidedAt?: Date;
  }): Promise<number> {
    const amount = options.amount ?? 1000;
    const points = options.points ?? 10;
    const bonusPoints = options.bonusPoints ?? 0;
    const voided = options.voidedAt !== undefined;
    const consumption = await this.prisma.consumption.create({
      data: {
        customerId: options.customerId,
        amount,
        points,
        bonusPoints,
        configurationVersion: 1,
        baseAmount: 1000,
        pointsAwarded: 10,
        status: voided ? 'VOIDED' : 'REGISTERED',
        registeredByAccountId: this.actor.accountId,
        registeredByName: 'Ana Gómez',
        createdAt: options.createdAt,
        ...(voided
          ? {
              voidedAt: options.voidedAt,
              voidedByAccountId: this.actor.accountId,
              voidedByName: 'Ana Gómez',
              voidedReason: 'Error de carga',
            }
          : {}),
      },
    });
    const total = points + bonusPoints;
    await this.movement({ customerId: options.customerId, type: 'CONSUMPTION_CREDIT', points: total, createdAt: options.createdAt, consumptionId: consumption.id });
    if (voided && total !== 0) {
      await this.movement({ customerId: options.customerId, type: 'VOID_REVERSAL', points: -total, createdAt: options.voidedAt as Date, consumptionId: consumption.id });
    }
    return consumption.id;
  }

  async movement(options: {
    customerId: number;
    type: 'CONSUMPTION_CREDIT' | 'VOID_REVERSAL' | 'EXPIRATION' | 'REDEMPTION' | 'MISSION_REWARD' | 'BIRTHDAY_BONUS' | 'MANUAL_ADJUSTMENT';
    points: number;
    createdAt: Date;
    consumptionId?: number;
    redemptionId?: number;
    customerMissionId?: number;
  }): Promise<void> {
    await this.prisma.pointsMovement.create({
      data: {
        customerId: options.customerId,
        type: options.type,
        points: options.points,
        balanceAfter: 0,
        reason: options.type === 'MANUAL_ADJUSTMENT' ? 'Ajuste de prueba' : null,
        consumptionId: options.consumptionId ?? null,
        redemptionId: options.redemptionId ?? null,
        customerMissionId: options.customerMissionId ?? null,
        performedByAccountId: options.type === 'CONSUMPTION_CREDIT' || options.type === 'VOID_REVERSAL' ? this.actor.accountId : null,
        performedByName: options.type === 'CONSUMPTION_CREDIT' || options.type === 'VOID_REVERSAL' ? 'Ana Gómez' : 'Sistema',
        createdAt: options.createdAt,
      },
    });
  }

  async reward(name: string): Promise<number> {
    return (await this.prisma.reward.create({ data: { name, points: 150, stock: 100 } })).id;
  }

  // Un canje USED (con su movimiento REDEMPTION) resuelto en `usedAt`
  async usedRedemption(options: { customerId: number; rewardId: number; rewardName: string; usedAt: Date }): Promise<void> {
    const n = unique();
    const createdAt = new Date(options.usedAt.getTime() - 5 * 60 * 1000);
    const redemption = await this.prisma.redemption.create({
      data: {
        code: redemptionCode(n),
        customerId: options.customerId,
        rewardId: options.rewardId,
        rewardName: options.rewardName,
        points: 150,
        status: 'USED',
        origin: 'COUNTER',
        confirmedByAccountId: this.actor.accountId,
        confirmedByName: 'Ana Gómez',
        createdAt,
        expiresAt: new Date(createdAt.getTime() + 15 * 60 * 1000),
        resolvedAt: options.usedAt,
        resolvedByAccountId: this.actor.accountId,
        resolvedByName: 'Ana Gómez',
        balanceBefore: 500,
        balanceAfter: 350,
      },
    });
    await this.movement({ customerId: options.customerId, type: 'REDEMPTION', points: -150, createdAt: options.usedAt, redemptionId: redemption.id });
  }

  async mission(name: string): Promise<number> {
    return (
      await this.prisma.mission.create({
        data: { name, objectiveType: 'CONSUMPTION_COUNT', target: 3, rewardPoints: 50, startMonth: new Date('2026-01-01T00:00:00.000Z') },
      })
    ).id;
  }

  // La asignación de una misión de un cliente en un mes (`period` = YYYY-MM-01), en el estado pedido
  async customerMission(options: {
    missionId: number;
    customerId: number;
    period: string;
    status: 'IN_PROGRESS' | 'COMPLETED' | 'CLAIMED' | 'EXPIRED';
  }): Promise<void> {
    const at = new Date(`${options.period}T15:00:00.000Z`);
    const { status } = options;
    await this.prisma.customerMission.create({
      data: {
        missionId: options.missionId,
        customerId: options.customerId,
        period: new Date(`${options.period}T00:00:00.000Z`),
        objectiveType: 'CONSUMPTION_COUNT',
        target: 3,
        rewardPoints: 50,
        progress: status === 'IN_PROGRESS' ? 1 : 3,
        status,
        completedAt: status === 'COMPLETED' || status === 'CLAIMED' ? at : null,
        claimedAt: status === 'CLAIMED' ? at : null,
        claimedBy: status === 'CLAIMED' ? 'CUSTOMER' : null,
        expiredAt: status === 'EXPIRED' ? at : null,
        expirationReason: status === 'EXPIRED' ? 'Fin de mes' : null,
      },
    });
  }
}
