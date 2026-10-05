import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { PrismaTransactionRunner } from '../src/prisma/prisma-transaction-runner.js';

// Cubre PrismaTransactionRunner, que es lo que usan los casos de uso (vía su puerto) y los
// repositorios. Corre contra la base de tests.
describe('Transacción ambiente (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tx: PrismaTransactionRunner;

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
    tx = app.get(PrismaTransactionRunner);
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
    await tx.run(async () => {
      await tx.client.employee.create({ data: employee('a@test.com') });
      await tx.client.employee.create({ data: employee('b@test.com') });
    });

    expect(await emails()).toEqual(['a@test.com', 'b@test.com']);
  });

  it('rollback: si la función tira, no queda ninguna escritura', async () => {
    await expect(
      tx.run(async () => {
        await tx.client.employee.create({ data: employee('a@test.com') });
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(await emails()).toEqual([]);
  });

  it('anidado: la transacción de adentro se suma a la de afuera y se deshace con ella', async () => {
    await expect(
      tx.run(async () => {
        await tx.client.employee.create({ data: employee('a@test.com') });

        await tx.run(async () => {
          await tx.client.employee.create({ data: employee('b@test.com') });
        });

        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(await emails()).toEqual([]);
  });

  it('aislamiento: dos transacciones en paralelo no comparten cliente', async () => {
    const ok = tx.run(async () => {
      await tx.client.employee.create({ data: employee('ok@test.com') });
      await new Promise((resolve) => setTimeout(resolve, 50));
      await tx.client.employee.create({ data: employee('ok2@test.com') });
    });

    const failing = tx.run(async () => {
      await tx.client.employee.create({ data: employee('fail@test.com') });
      throw new Error('boom');
    });

    const results = await Promise.allSettled([ok, failing]);

    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'rejected']);
    expect(await emails()).toEqual(['ok2@test.com', 'ok@test.com']);
  });

  it('sin transacción: client es el cliente normal y escribe directo', async () => {
    await tx.client.employee.create({ data: employee('a@test.com') });

    expect(await emails()).toEqual(['a@test.com']);
  });

  it('dentro de la transacción las escrituras no se ven desde afuera hasta el commit', async () => {
    await tx.run(async () => {
      await tx.client.employee.create({ data: employee('a@test.com') });

      // `prisma` va por otra conexión, fuera de la transacción
      expect(await emails()).toEqual([]);
    });

    expect(await emails()).toEqual(['a@test.com']);
  });
});
