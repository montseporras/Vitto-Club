import { PointsMovementsPrismaRepository } from './points-movements.repository.js';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';

function fakePrisma() {
  return {
    $queryRaw: jest.fn(),
    customer: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    pointsMovement: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  };
}

function fakeTransactionRunner(prismaLike: ReturnType<typeof fakePrisma>): PrismaTransactionRunner {
  return { client: prismaLike } as unknown as PrismaTransactionRunner;
}

describe('PointsMovementsPrismaRepository', () => {
  let prisma: ReturnType<typeof fakePrisma>;
  let repository: PointsMovementsPrismaRepository;

  beforeEach(() => {
    prisma = fakePrisma();
    repository = new PointsMovementsPrismaRepository(fakeTransactionRunner(prisma));
  });

  it('customerExists(): true o false según exista la fila', async () => {
    prisma.customer.findUnique.mockResolvedValueOnce({ id: 3 }).mockResolvedValueOnce(null);

    await expect(repository.customerExists(3)).resolves.toBe(true);
    await expect(repository.customerExists(4)).resolves.toBe(false);
  });

  it('list(): filtros, orden createdAt desc + id desc y paginación', async () => {
    const createdFrom = new Date('2026-10-01T03:00:00.000Z');
    const createdBefore = new Date('2026-10-17T03:00:00.000Z');

    await repository.list({ customerId: 3, type: 'EXPIRATION', createdFrom, createdBefore, page: 3, limit: 10 });

    const args = prisma.pointsMovement.findMany.mock.calls[0][0];
    expect(args.where).toEqual({
      AND: [
        { customerId: 3 },
        { type: 'EXPIRATION' },
        { createdAt: { gte: createdFrom } },
        { createdAt: { lt: createdBefore } },
      ],
    });
    expect(args.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
    expect(args.skip).toBe(20);
    expect(args.take).toBe(10);
    expect(prisma.pointsMovement.count).toHaveBeenCalledWith({ where: args.where });
  });

  it('list() con documento: busca los clientes por número parcial y filtra por esos ids', async () => {
    prisma.customer.findMany.mockResolvedValue([{ id: 3 }, { id: 8 }]);

    await repository.list({ search: { kind: 'document', documentNumber: '38456' }, page: 1, limit: 10 });

    expect(prisma.customer.findMany).toHaveBeenCalledWith({
      where: { documentNumber: { contains: '38456' } },
      select: { id: true },
    });
    expect(prisma.pointsMovement.findMany.mock.calls[0][0].where).toEqual({
      AND: [{ customerId: { in: [3, 8] } }],
    });
  });

  it('list() con nombre: consulta SQL sin tildes y filtra por esos ids', async () => {
    prisma.$queryRaw.mockResolvedValue([{ id: 5 }]);

    await repository.list({ search: { kind: 'name', terms: ['perez'] }, page: 1, limit: 10 });

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.pointsMovement.findMany.mock.calls[0][0].where).toEqual({
      AND: [{ customerId: { in: [5] } }],
    });
  });

  it('list() sin clientes que coincidan: página vacía sin consultar movimientos', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    await expect(
      repository.list({ search: { kind: 'name', terms: ['zzz'] }, page: 1, limit: 10 }),
    ).resolves.toEqual({ items: [], total: 0 });
    expect(prisma.pointsMovement.findMany).not.toHaveBeenCalled();
  });
});
