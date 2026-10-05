import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// SPIKE: ¿anda la transacción ambiente de @nestjs-cls/transactional con Nest 12, Prisma 7,
// el PrismaService actual (extiende PrismaClient + adapter de pg) y Jest en ESM?
describe('Transacción ambiente (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let txHost: TransactionHost<TransactionalAdapterPrisma<PrismaService>>;

  const employee = (email: string) => ({
    firstName: 'Test',
    lastName: 'Tx',
    phone: '3510000000',
    email,
    role: 'CASHIER' as const,
  });

  const emails = async () =>
    (await prisma.employee.findMany({ orderBy: { email: 'asc' } })).map((e) => e.email);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    txHost = app.get(TransactionHost);
  });

  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.employee.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('commit: si la función termina, quedan todas las escrituras', async () => {
    await txHost.withTransaction(async () => {
      await txHost.tx.employee.create({ data: employee('a@test.com') });
      await txHost.tx.employee.create({ data: employee('b@test.com') });
    });

    expect(await emails()).toEqual(['a@test.com', 'b@test.com']);
  });

  it('rollback: si la función tira, no queda ninguna escritura', async () => {
    await expect(
      txHost.withTransaction(async () => {
        await txHost.tx.employee.create({ data: employee('a@test.com') });
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(await emails()).toEqual([]);
  });

  it('anidado: la transacción de adentro se suma a la de afuera y se deshace con ella', async () => {
    await expect(
      txHost.withTransaction(async () => {
        await txHost.tx.employee.create({ data: employee('a@test.com') });

        await txHost.withTransaction(async () => {
          await txHost.tx.employee.create({ data: employee('b@test.com') });
        });

        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(await emails()).toEqual([]);
  });

  it('aislamiento: dos transacciones en paralelo no comparten cliente', async () => {
    const ok = txHost.withTransaction(async () => {
      await txHost.tx.employee.create({ data: employee('ok@test.com') });
      await new Promise((resolve) => setTimeout(resolve, 50));
      await txHost.tx.employee.create({ data: employee('ok2@test.com') });
    });

    const failing = txHost.withTransaction(async () => {
      await txHost.tx.employee.create({ data: employee('fail@test.com') });
      throw new Error('boom');
    });

    const results = await Promise.allSettled([ok, failing]);

    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'rejected']);
    expect(await emails()).toEqual(['ok2@test.com', 'ok@test.com']);
  });

  it('sin transacción: txHost.tx usa el cliente normal y escribe directo', async () => {
    expect(txHost.isTransactionActive()).toBe(false);

    await txHost.tx.employee.create({ data: employee('a@test.com') });

    expect(await emails()).toEqual(['a@test.com']);
  });

  it('dentro de la transacción las escrituras no se ven desde afuera hasta el commit', async () => {
    await txHost.withTransaction(async () => {
      await txHost.tx.employee.create({ data: employee('a@test.com') });

      expect(txHost.isTransactionActive()).toBe(true);
      // `prisma` va por otra conexión, fuera de la transacción
      expect(await emails()).toEqual([]);
    });

    expect(await emails()).toEqual(['a@test.com']);
  });
});
