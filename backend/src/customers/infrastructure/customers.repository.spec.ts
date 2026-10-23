import { CustomerPrismaRepository } from './customers.repository.js';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import { Customer } from '../domain/customer.js';

// Cliente de Prisma simulado: solo lo que usan estos tests. Registra el orden de las
// escrituras para comprobar que van juntas dentro de la transacción.
function fakePrisma(calls: string[]) {
  return {
    customer: {
      update: jest.fn(async () => {
        calls.push('customer.update');
      }),
      findFirst: jest.fn(async () => null),
    },
    customerStatusChange: {
      create: jest.fn(async () => {
        calls.push('customerStatusChange.create');
      }),
    },
  };
}

// El repositorio usa .client para las queries y run() para agrupar escrituras. Este fake
// marca cuándo se abre y se cierra la transacción.
function fakeTransactionRunner(prismaLike: object, calls: string[]): PrismaTransactionRunner {
  return {
    client: prismaLike,
    run: async <T>(fn: () => Promise<T>): Promise<T> => {
      calls.push('run:start');
      const result = await fn();
      calls.push('run:end');
      return result;
    },
  } as unknown as PrismaTransactionRunner;
}

function persistedCustomer(active: boolean): Customer {
  return Customer.reconstruct({
    id: 7,
    firstName: 'Juan',
    lastName: 'Pérez',
    documentType: 'DNI',
    documentNumber: '12345678',
    email: 'juan@example.com',
    active,
    deactivatedAt: active ? null : new Date('2026-10-01T00:00:00Z'),
  });
}

describe('CustomerPrismaRepository', () => {
  describe('updateStatus()', () => {
    it('guarda el estado y el registro del historial dentro de una misma transacción', async () => {
      const calls: string[] = [];
      const prisma = fakePrisma(calls);
      const repo = new CustomerPrismaRepository(fakeTransactionRunner(prisma, calls));

      await repo.updateStatus(persistedCustomer(false), 'DEACTIVATED');

      expect(calls).toEqual(['run:start', 'customer.update', 'customerStatusChange.create', 'run:end']);
      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: { isActive: false, deactivatedAt: new Date('2026-10-01T00:00:00Z') },
      });
      expect(prisma.customerStatusChange.create).toHaveBeenCalledWith({
        data: { customerId: 7, action: 'DEACTIVATED' },
      });
    });

    it('si falla el historial, el error llega a quien llamó (y la transacción se deshace)', async () => {
      const calls: string[] = [];
      const prisma = fakePrisma(calls);
      prisma.customerStatusChange.create.mockRejectedValueOnce(new Error('db down'));
      const repo = new CustomerPrismaRepository(fakeTransactionRunner(prisma, calls));

      await expect(repo.updateStatus(persistedCustomer(true), 'ACTIVATED')).rejects.toThrow('db down');
      expect(calls).not.toContain('run:end');
    });

    it('sin id lanza error y no escribe nada', async () => {
      const calls: string[] = [];
      const prisma = fakePrisma(calls);
      const repo = new CustomerPrismaRepository(fakeTransactionRunner(prisma, calls));
      const unsaved = Customer.create({
        firstName: 'Juan',
        lastName: 'Pérez',
        documentType: 'DNI',
        documentNumber: '12345678',
        email: 'juan@example.com',
      });

      await expect(repo.updateStatus(unsaved, 'DEACTIVATED')).rejects.toThrow('Customer id is required');
      expect(calls).toEqual([]);
    });
  });

  // CLI-ADM: listado con q, level y sort, y saldo / acumulados / nivel por ítem
  describe('list()', () => {
    const row = (id: number, points: { balance: number; lifetimePoints: number } | null) => ({
      id,
      firstName: 'Ana',
      lastName: 'Pérez',
      documentType: 'DNI',
      documentNumber: '30111222',
      email: 'ana@example.com',
      phone: null,
      dateOfBirth: null,
      isActive: true,
      deactivatedAt: null,
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
      points,
    });

    const listPrisma = (rows: unknown[], config: { silverMinPoints: number; goldMinPoints: number } | null) => ({
      loyaltyProgramConfiguration: { findFirst: jest.fn(async () => config) },
      customer: { findMany: jest.fn(async () => rows), count: jest.fn(async () => rows.length) },
      customerPoints: { findUnique: jest.fn() },
    });

    const repoWith = (prisma: object) => new CustomerPrismaRepository(fakeTransactionRunner(prisma, []));

    it('calcula balance, lifetimePoints y nivel de cada ítem; sin fila de puntos todo es 0 y Bronce', async () => {
      const prisma = listPrisma(
        [row(1, { balance: -5, lifetimePoints: 850 }), row(2, { balance: 10, lifetimePoints: 300 }), row(3, null)],
        { silverMinPoints: 300, goldMinPoints: 800 },
      );

      const { items, total } = await repoWith(prisma).list({ page: 1, limit: 20 });

      expect(total).toBe(3);
      expect(items.map(({ balance, lifetimePoints, level }) => ({ balance, lifetimePoints, level }))).toEqual([
        { balance: -5, lifetimePoints: 850, level: 'GOLD' },
        { balance: 10, lifetimePoints: 300, level: 'SILVER' },
        { balance: 0, lifetimePoints: 0, level: 'BRONZE' },
      ]);
    });

    it('usa los umbrales vigentes y, sin configuración activa, los de por defecto (300 y 800)', async () => {
      const custom = listPrisma([row(1, { balance: 0, lifetimePoints: 100 })], { silverMinPoints: 50, goldMinPoints: 90 });
      const none = listPrisma([row(1, { balance: 0, lifetimePoints: 300 })], null);

      expect((await repoWith(custom).list({ page: 1, limit: 20 })).items[0].level).toBe('GOLD');
      expect((await repoWith(none).list({ page: 1, limit: 20 })).items[0].level).toBe('SILVER');
    });

    it('sort=lastName ordena por apellido, nombre e id; por defecto, por id', async () => {
      const prisma = listPrisma([], { silverMinPoints: 300, goldMinPoints: 800 });
      const repo = repoWith(prisma);

      await repo.list({ page: 1, limit: 20, sort: 'lastName' });
      await repo.list({ page: 1, limit: 20 });

      expect(prisma.customer.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }] }),
      );
      expect(prisma.customer.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({ orderBy: { id: 'asc' } }));
    });

    it('q busca cada palabra en nombre, apellido o documento normalizado (parcial)', async () => {
      const prisma = listPrisma([], { silverMinPoints: 300, goldMinPoints: 800 });

      await repoWith(prisma).list({ page: 1, limit: 20, search: '30.111 ana', active: true });

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              { isActive: true },
              {
                OR: [
                  { firstName: { contains: '30.111', mode: 'insensitive' } },
                  { lastName: { contains: '30.111', mode: 'insensitive' } },
                  { documentNumber: { contains: '30111' } },
                ],
              },
              {
                OR: [
                  { firstName: { contains: 'ana', mode: 'insensitive' } },
                  { lastName: { contains: 'ana', mode: 'insensitive' } },
                  { documentNumber: { contains: 'ANA' } },
                ],
              },
            ],
          },
        }),
      );
    });

    it.each([
      ['GOLD', { points: { is: { lifetimePoints: { gte: 800 } } } }],
      ['SILVER', { points: { is: { lifetimePoints: { gte: 300, lt: 800 } } } }],
      ['BRONZE', { OR: [{ points: { is: null } }, { points: { is: { lifetimePoints: { lt: 300 } } } }] }],
    ] as const)('level=%s filtra por el rango de lifetimePoints (BRONZE incluye a quien no tiene fila)', async (level, filter) => {
      const prisma = listPrisma([], { silverMinPoints: 300, goldMinPoints: 800 });

      await repoWith(prisma).list({ page: 1, limit: 20, level });

      expect(prisma.customer.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { AND: [filter] } }));
      expect(prisma.customer.count).toHaveBeenCalledWith({ where: { AND: [filter] } });
    });
  });

  describe('findBalance()', () => {
    const repoWithPoints = (found: { balance: number } | null) =>
      new CustomerPrismaRepository(fakeTransactionRunner({ customerPoints: { findUnique: jest.fn(async () => found) } }, []));

    it('devuelve el saldo del cliente (puede ser negativo)', async () => {
      expect(await repoWithPoints({ balance: -30 }).findBalance(7)).toBe(-30);
    });

    it('un cliente sin movimientos tiene saldo 0', async () => {
      expect(await repoWithPoints(null).findBalance(7)).toBe(0);
    });
  });

  it('las consultas usan el cliente de la transacción en curso (.client)', async () => {
    const calls: string[] = [];
    const prisma = fakePrisma(calls);
    const repo = new CustomerPrismaRepository(fakeTransactionRunner(prisma, calls));

    await repo.existsByEmail('juan@example.com');

    expect(prisma.customer.findFirst).toHaveBeenCalledTimes(1);
  });
});
