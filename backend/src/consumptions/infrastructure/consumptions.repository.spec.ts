import { NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ConsumptionPrismaRepository, toDomain } from './consumptions.repository.js';
import { Consumption } from '../domain/consumption.js';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';

// Mismo espíritu que accounts.repository.spec.ts: mock liviano del cliente, sin base real.
function fakePrisma() {
  return {
    consumption: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    customer: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
  };
}

function fakeTransactionRunner(prismaLike: ReturnType<typeof fakePrisma>): PrismaTransactionRunner {
  return { client: prismaLike } as unknown as PrismaTransactionRunner;
}

const BASE_RECORD = {
  id: 141,
  customerId: 101,
  amount: { toString: () => '50000' } as unknown as Prisma.Decimal, // simula Prisma.Decimal
  notes: null,
  points: 500,
  bonusPoints: 0,
  configurationVersion: 4,
  baseAmount: { toString: () => '1000' } as unknown as Prisma.Decimal,
  pointsAwarded: 10,
  status: 'REGISTERED' as const,
  registeredByAccountId: 12,
  registeredByName: 'Ana Pereyra',
  createdAt: new Date('2026-10-16T18:40:00.000Z'),
  voidedAt: null,
  voidedByAccountId: null,
  voidedByName: null,
  voidedReason: null,
};

describe('toDomain (mapeo Consumption dominio <-> Prisma)', () => {
  it('mapea amount/baseAmount a number y el resto tal cual', () => {
    const consumption = toDomain(BASE_RECORD);

    expect(consumption.getId()).toBe(141);
    expect(consumption.getCustomerId()).toBe(101);
    expect(consumption.getAmount()).toBe(50000);
    expect(consumption.getBaseAmount()).toBe(1000);
    expect(consumption.getPointsAwarded()).toBe(10);
    expect(consumption.getStatus()).toBe('REGISTERED');
    expect(consumption.getCode()).toBe('C-000141');
  });
});

describe('ConsumptionPrismaRepository', () => {
  describe('save()', () => {
    it('inserta el consumo con los campos del dominio', async () => {
      const prisma = fakePrisma();
      (prisma.consumption.create as jest.Mock).mockResolvedValue(BASE_RECORD);
      const repo = new ConsumptionPrismaRepository(fakeTransactionRunner(prisma));
      const consumption = Consumption.create({
        customerId: 101,
        amount: 50000,
        points: 500,
        bonusPoints: 0,
        configurationVersion: 4,
        baseAmount: 1000,
        pointsAwarded: 10,
        registeredByAccountId: 12,
        registeredByName: 'Ana Pereyra',
      });

      const saved = await repo.save(consumption);

      expect(prisma.consumption.create).toHaveBeenCalledWith({
        data: {
          customerId: 101,
          amount: 50000,
          notes: null,
          points: 500,
          bonusPoints: 0,
          configurationVersion: 4,
          baseAmount: 1000,
          pointsAwarded: 10,
          registeredByAccountId: 12,
          registeredByName: 'Ana Pereyra',
        },
      });
      expect(saved.getId()).toBe(141);
    });
  });

  describe('findByCode()', () => {
    it('resuelve el código al id y busca por id', async () => {
      const prisma = fakePrisma();
      (prisma.consumption.findUnique as jest.Mock).mockResolvedValue(BASE_RECORD);
      const repo = new ConsumptionPrismaRepository(fakeTransactionRunner(prisma));

      const consumption = await repo.findByCode('C-000141');

      expect(prisma.consumption.findUnique).toHaveBeenCalledWith({ where: { id: 141 } });
      expect(consumption?.getId()).toBe(141);
    });

    it('null sin consultar Prisma si el código tiene formato inválido', async () => {
      const prisma = fakePrisma();
      const repo = new ConsumptionPrismaRepository(fakeTransactionRunner(prisma));

      const consumption = await repo.findByCode('141');

      expect(consumption).toBeNull();
      expect(prisma.consumption.findUnique).not.toHaveBeenCalled();
    });

    it('null si Prisma no encuentra nada', async () => {
      const prisma = fakePrisma();
      (prisma.consumption.findUnique as jest.Mock).mockResolvedValue(null);
      const repo = new ConsumptionPrismaRepository(fakeTransactionRunner(prisma));

      expect(await repo.findByCode('C-999999')).toBeNull();
    });
  });

  describe('existsRegisteredByCustomerId()', () => {
    it('true si Prisma encuentra un REGISTERED de ese cliente', async () => {
      const prisma = fakePrisma();
      (prisma.consumption.findFirst as jest.Mock).mockResolvedValue({ id: 1 });
      const repo = new ConsumptionPrismaRepository(fakeTransactionRunner(prisma));

      expect(await repo.existsRegisteredByCustomerId(101)).toBe(true);
      expect(prisma.consumption.findFirst).toHaveBeenCalledWith({
        where: { customerId: 101, status: 'REGISTERED' },
        select: { id: true },
      });
    });

    it('false si no hay ninguno', async () => {
      const prisma = fakePrisma();
      (prisma.consumption.findFirst as jest.Mock).mockResolvedValue(null);
      const repo = new ConsumptionPrismaRepository(fakeTransactionRunner(prisma));

      expect(await repo.existsRegisteredByCustomerId(101)).toBe(false);
    });
  });

  describe('updateVoidStatus()', () => {
    it('escribe status y los campos de anulación', async () => {
      const prisma = fakePrisma();
      const repo = new ConsumptionPrismaRepository(fakeTransactionRunner(prisma));
      const consumption = toDomain(BASE_RECORD);
      consumption.void({ voidedByAccountId: 7, voidedByName: 'Bruno Pérez', reason: 'motivo válido' });

      await repo.updateVoidStatus(consumption);

      expect(prisma.consumption.update).toHaveBeenCalledWith({
        where: { id: 141 },
        data: {
          status: 'VOIDED',
          voidedAt: consumption.getVoidedAt(),
          voidedByAccountId: 7,
          voidedByName: 'Bruno Pérez',
          voidedReason: 'motivo válido',
        },
      });
    });

    it('lanza NotFoundException si el consumo no tiene id', async () => {
      const repo = new ConsumptionPrismaRepository(fakeTransactionRunner(fakePrisma()));
      const consumption = Consumption.create({
        customerId: 101,
        amount: 50000,
        points: 500,
        bonusPoints: 0,
        configurationVersion: 4,
        baseAmount: 1000,
        pointsAwarded: 10,
        registeredByAccountId: 12,
        registeredByName: 'Ana Pereyra',
      });

      await expect(repo.updateVoidStatus(consumption)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCustomerId()', () => {
    it('filtra por customerId, pagina y ordena por createdAt descendente', async () => {
      const prisma = fakePrisma();
      (prisma.consumption.findMany as jest.Mock).mockResolvedValue([BASE_RECORD]);
      (prisma.consumption.count as jest.Mock).mockResolvedValue(1);
      const repo = new ConsumptionPrismaRepository(fakeTransactionRunner(prisma));

      const result = await repo.findByCustomerId(101, { last24h: false, page: 1, limit: 20 });

      expect(prisma.consumption.findMany).toHaveBeenCalledWith({
        where: { customerId: 101 },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
      expect(prisma.consumption.count).toHaveBeenCalledWith({ where: { customerId: 101 } });
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
    });

    it('agrega el filtro de status cuando se pide', async () => {
      const prisma = fakePrisma();
      (prisma.consumption.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.consumption.count as jest.Mock).mockResolvedValue(0);
      const repo = new ConsumptionPrismaRepository(fakeTransactionRunner(prisma));

      await repo.findByCustomerId(101, { last24h: false, status: 'VOIDED', page: 1, limit: 20 });

      expect(prisma.consumption.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { customerId: 101, status: 'VOIDED' } }),
      );
    });

    it('agrega el filtro de últimas 24 hs cuando last24h es true', async () => {
      const prisma = fakePrisma();
      (prisma.consumption.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.consumption.count as jest.Mock).mockResolvedValue(0);
      const repo = new ConsumptionPrismaRepository(fakeTransactionRunner(prisma));

      await repo.findByCustomerId(101, { last24h: true, page: 1, limit: 20 });

      const call = (prisma.consumption.findMany as jest.Mock).mock.calls[0][0];
      expect(call.where.customerId).toBe(101);
      expect(call.where.createdAt.gte).toBeInstanceOf(Date);
    });

    it('calcula skip según la página', async () => {
      const prisma = fakePrisma();
      (prisma.consumption.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.consumption.count as jest.Mock).mockResolvedValue(0);
      const repo = new ConsumptionPrismaRepository(fakeTransactionRunner(prisma));

      await repo.findByCustomerId(101, { last24h: false, page: 3, limit: 10 });

      expect(prisma.consumption.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  describe('findAll() — US-23', () => {
    const CUSTOMER = { id: 101, firstName: 'Carolina', lastName: 'Fernández', documentType: 'DNI', documentNumber: '38456123' };

    function prismaWithRows() {
      const prisma = fakePrisma();
      (prisma.consumption.findMany as jest.Mock).mockResolvedValue([{ ...BASE_RECORD, customer: CUSTOMER }]);
      (prisma.consumption.count as jest.Mock).mockResolvedValue(17);
      (prisma.consumption.aggregate as jest.Mock).mockResolvedValue({
        _sum: { amount: { toString: () => '735700.5' }, points: 7300, bonusPoints: 57 },
      });
      return prisma;
    }

    it('arma el where con todos los filtros, pagina y ordena por createdAt descendente', async () => {
      const prisma = prismaWithRows();
      const repo = new ConsumptionPrismaRepository(fakeTransactionRunner(prisma));
      const createdFrom = new Date('2026-10-01T03:00:00.000Z');
      const createdBefore = new Date('2026-10-16T03:00:00.000Z');

      await repo.findAll({
        customerId: 101,
        status: 'REGISTERED',
        registeredByAccountId: 12,
        createdFrom,
        createdBefore,
        page: 2,
        limit: 8,
      });

      const expectedWhere = {
        AND: [
          { customerId: 101 },
          { status: 'REGISTERED' },
          { registeredByAccountId: 12 },
          { createdAt: { gte: createdFrom } },
          { createdAt: { lt: createdBefore } },
        ],
      };
      expect(prisma.consumption.findMany).toHaveBeenCalledWith({
        where: expectedWhere,
        include: { customer: { select: { id: true, firstName: true, lastName: true, documentType: true, documentNumber: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 8,
        take: 8,
      });
      expect(prisma.consumption.count).toHaveBeenCalledWith({ where: expectedWhere });
    });

    it('totales: count es el total; monto y puntos salen del aggregate de los REGISTERED', async () => {
      const prisma = prismaWithRows();
      const repo = new ConsumptionPrismaRepository(fakeTransactionRunner(prisma));

      const result = await repo.findAll({ page: 1, limit: 8 });

      expect(prisma.consumption.aggregate).toHaveBeenCalledWith({
        where: { AND: [{ AND: [] }, { status: 'REGISTERED' }] },
        _sum: { amount: true, points: true, bonusPoints: true },
      });
      expect(result.total).toBe(17);
      expect(result.totals).toEqual({ count: 17, amountTotal: 735700.5, pointsTotal: 7357 });
    });

    it('cada ítem trae el consumo y los datos del cliente', async () => {
      const repo = new ConsumptionPrismaRepository(fakeTransactionRunner(prismaWithRows()));

      const result = await repo.findAll({ page: 1, limit: 8 });

      expect(result.items[0].consumption.getCode()).toBe('C-000141');
      expect(result.items[0].customer).toEqual(CUSTOMER);
    });

    it('totales en cero si no hay consumos REGISTERED (el aggregate devuelve null)', async () => {
      const prisma = fakePrisma();
      (prisma.consumption.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.consumption.count as jest.Mock).mockResolvedValue(0);
      (prisma.consumption.aggregate as jest.Mock).mockResolvedValue({
        _sum: { amount: null, points: null, bonusPoints: null },
      });
      const repo = new ConsumptionPrismaRepository(fakeTransactionRunner(prisma));

      const result = await repo.findAll({ page: 1, limit: 8 });

      expect(result.totals).toEqual({ count: 0, amountTotal: 0, pointsTotal: 0 });
    });

    it('q por documento: busca los clientes por coincidencia parcial y filtra por sus ids', async () => {
      const prisma = prismaWithRows();
      (prisma.customer.findMany as jest.Mock).mockResolvedValue([{ id: 101 }, { id: 105 }]);
      const repo = new ConsumptionPrismaRepository(fakeTransactionRunner(prisma));

      await repo.findAll({ search: { kind: 'document', documentNumber: '384' }, page: 1, limit: 8 });

      expect(prisma.customer.findMany).toHaveBeenCalledWith({
        where: { documentNumber: { contains: '384' } },
        select: { id: true },
      });
      expect(prisma.consumption.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { AND: [{ customerId: { in: [101, 105] } }] } }),
      );
    });

    it('q por nombre: busca sin tildes con una consulta a customers', async () => {
      const prisma = prismaWithRows();
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ id: 101 }]);
      const repo = new ConsumptionPrismaRepository(fakeTransactionRunner(prisma));

      await repo.findAll({ search: { kind: 'name', terms: ['fernandez'] }, page: 1, limit: 8 });

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(prisma.consumption.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { AND: [{ customerId: { in: [101] } }] } }),
      );
    });

    it('si q no encuentra clientes, responde vacío sin consultar los consumos', async () => {
      const prisma = fakePrisma();
      (prisma.customer.findMany as jest.Mock).mockResolvedValue([]);
      const repo = new ConsumptionPrismaRepository(fakeTransactionRunner(prisma));

      const result = await repo.findAll({ search: { kind: 'document', documentNumber: '999' }, page: 1, limit: 8 });

      expect(result).toEqual({ items: [], total: 0, totals: { count: 0, amountTotal: 0, pointsTotal: 0 } });
      expect(prisma.consumption.findMany).not.toHaveBeenCalled();
    });
  });
});
