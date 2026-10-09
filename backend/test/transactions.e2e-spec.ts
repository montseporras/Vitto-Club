import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { PrismaTransactionRunner } from '../src/prisma/prisma-transaction-runner.js';

const employee = (email: string) => ({
  firstName: 'Test',
  lastName: 'Tx',
  phone: '3510000000',
  email,
  role: 'CASHIER' as const,
});

// Listener de prueba: se comporta como el de un módulo real que escucha un evento de otro.
const TEST_EVENT = 'test.transaction-event';

@Injectable()
class TestListener {
  // Lo que el listener alcanzó a ver en la base al recibir el evento
  seenEmails: string[] = [];

  constructor(private readonly tx: PrismaTransactionRunner) {}

  @OnEvent(TEST_EVENT, { suppressErrors: false })
  async handle(payload: { email: string; fail: boolean }): Promise<void> {
    const visible = await this.tx.client.employee.findMany({ orderBy: { email: 'asc' } });
    this.seenEmails = visible.map((e) => e.email);

    await this.tx.client.employee.create({ data: employee(payload.email) });

    if (payload.fail) {
      throw new Error('listener boom');
    }
  }
}

// Cubre PrismaTransactionRunner, que es lo que usan los casos de uso (vía su puerto) y los
// repositorios, y los eventos de dominio publicados dentro de una transacción.
// Corre contra la base de tests.
describe('Transacción ambiente (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tx: PrismaTransactionRunner;
  let events: EventEmitter2;
  let listener: TestListener;

  const emails = async () =>
    (await prisma.employee.findMany({ orderBy: { email: 'asc' } })).map((e) => e.email);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [TestListener],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    tx = app.get(PrismaTransactionRunner);
    events = app.get(EventEmitter2);
    listener = app.get(TestListener);
  });

  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.employee.deleteMany();
    listener.seenEmails = [];
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

  describe('eventos de dominio', () => {
    it('si el listener termina bien, queda lo del publicador y lo del listener', async () => {
      await tx.run(async () => {
        await tx.client.employee.create({ data: employee('publisher@test.com') });
        await events.emitAsync(TEST_EVENT, { email: 'listener@test.com', fail: false });
      });

      expect(await emails()).toEqual(['listener@test.com', 'publisher@test.com']);
    });

    it('si el listener tira, el error llega al publicador y se deshace todo', async () => {
      await expect(
        tx.run(async () => {
          await tx.client.employee.create({ data: employee('publisher@test.com') });
          await events.emitAsync(TEST_EVENT, { email: 'listener@test.com', fail: true });
        }),
      ).rejects.toThrow('listener boom');

      expect(await emails()).toEqual([]);
    });

    it('el listener ve lo que el publicador escribió en la misma transacción', async () => {
      await tx.run(async () => {
        await tx.client.employee.create({ data: employee('publisher@test.com') });
        await events.emitAsync(TEST_EVENT, { email: 'listener@test.com', fail: false });
      });

      expect(listener.seenEmails).toEqual(['publisher@test.com']);
    });
  });
});
