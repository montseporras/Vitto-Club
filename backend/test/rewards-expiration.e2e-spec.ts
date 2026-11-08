import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { AuditService } from '../src/audit/application/audit.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { PrismaTransactionRunner } from '../src/prisma/prisma-transaction-runner.js';
import { REDEMPTION_DURATION_MS } from '../src/redemptions/domain/redemption.js';
import { RewardsAvailabilityService } from '../src/rewards/application/rewards-availability.service.js';
import { RewardRepository } from '../src/rewards/domain/port/reward.repository.js';

// CA-37.7: los procesos automáticos no corren solos durante los e2e (ni al iniciar ni con el cron);
// los tests llaman al proceso directo. Va acá porque test/setup-e2e-env.ts no se tocó (el cambio está
// anotado en src/rewards/documentation-updates-us37.md). ConfigModule no pisa lo ya definido.
process.env.REWARDS_EXPIRATION_CRON_ENABLED = 'false';
process.env.REDEMPTIONS_EXPIRATION_CRON_ENABLED = 'false';

// Cubre US-37 (contrato S4 §3.4 y REWARD_DISABLED / REWARD_ENABLED de §3.14.2) contra Postgres real.
// No tiene endpoint: se llama directo a RewardsAvailabilityService, igual que el cron, el arranque y
// el comando. reevaluarDisponibilidad la van a llamar US-35 (editar) y US-42 (usar); acá se prueba
// sola, dentro de una transacción, como la van a usar ellas.
describe('Disponibilidad automática de recompensas (e2e, US-37)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let availability: RewardsAvailabilityService;
  let rewards: RewardRepository;
  let auditService: AuditService;
  let transactionRunner: PrismaTransactionRunner;
  let lastAuditId = 0;

  // 07/11/2026 00:05 en Argentina: "hoy" es 2026-11-07
  const NOW = new Date('2026-11-07T03:05:00.000Z');
  const HOY = '2026-11-07';
  const date = (day: string) => new Date(`${day}T00:00:00.000Z`);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    availability = app.get(RewardsAvailabilityService);
    rewards = app.get(RewardRepository);
    auditService = app.get(AuditService);
    transactionRunner = app.get(PrismaTransactionRunner);
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
    await cleanDatabase();
    lastAuditId = (await prisma.auditLog.findFirst({ orderBy: { id: 'desc' } }))?.id ?? 0;
  });

  async function cleanDatabase() {
    await prisma.pointsMovement.deleteMany();
    await prisma.redemption.deleteMany();
    await prisma.reward.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.customerStatusChange.deleteMany();
    await prisma.customer.deleteMany();
  }

  const newAuditRows = () =>
    prisma.auditLog.findMany({ where: { id: { gt: lastAuditId } }, orderBy: { id: 'asc' } });

  const rewardOf = (id: number) =>
    prisma.reward.findUniqueOrThrow({ where: { id }, select: { status: true, disabledReason: true } });

  // Escenario del proceso diario:
  // - "Pizza libre viernes": ACTIVE, venció ayer → se deshabilita.
  // - "Brunch": ACTIVE, venció hace una semana → se deshabilita.
  // - "Café + medialuna": ACTIVE, vence hoy → no se toca (CA-37.3).
  // - "Licuado": ACTIVE, no vence → no se toca.
  // - "Tostado": INACTIVE vencida → no se toca.
  // - "Postre": DISABLED / OUT_OF_STOCK vencida → no se toca (el proceso solo toma ACTIVE, §3.4).
  // - "Combo": DELETED vencida → no se toca.
  async function seedScenario() {
    const create = (name: string, data: object) => prisma.reward.create({ data: { name, points: 150, stock: 5, ...data } });
    return {
      pizza: await create('Pizza libre viernes', { expiresAt: date('2026-11-06') }),
      brunch: await create('Brunch', { expiresAt: date('2026-10-31') }),
      cafe: await create('Café + medialuna', { expiresAt: date(HOY) }),
      licuado: await create('Licuado', { expiresAt: null }),
      tostado: await create('Tostado', { status: 'INACTIVE', expiresAt: date('2026-11-06') }),
      postre: await create('Postre', { status: 'DISABLED', disabledReason: 'OUT_OF_STOCK', stock: 0, expiresAt: date('2026-11-06') }),
      combo: await create('Combo', { status: 'DELETED', deletedAt: NOW, expiresAt: date('2026-11-06') }),
    };
  }

  describe('proceso diario (CA-37.2 a CA-37.6)', () => {
    it('CA-37.2: las ACTIVE vencidas pasan a DISABLED / EXPIRED y se audita "Motivo: Vencida"', async () => {
      const s = await seedScenario();

      const result = await availability.runDailyExpiration(NOW);

      expect(result).toEqual({ disabled: 2, failures: [] });
      expect(await rewardOf(s.pizza.id)).toEqual({ status: 'DISABLED', disabledReason: 'EXPIRED' });
      expect(await rewardOf(s.brunch.id)).toEqual({ status: 'DISABLED', disabledReason: 'EXPIRED' });

      const rows = await newAuditRows();
      expect(rows).toHaveLength(2);
      expect(rows.find((row) => row.description?.includes('Pizza'))).toMatchObject({
        actorType: 'SYSTEM',
        actorAccountId: null,
        performedBy: 'Sistema',
        module: 'REWARDS',
        actionCode: 'REWARD_DISABLED',
        description: 'Deshabilitó la recompensa "Pizza libre viernes"',
        affectedCustomerId: null,
        operationCode: null,
        details: [{ label: 'Motivo', value: 'Vencida' }],
      });
    });

    it('CA-37.3: la que vence hoy, la que no vence y las que no están ACTIVE no se tocan', async () => {
      const s = await seedScenario();

      await availability.runDailyExpiration(NOW);

      expect(await rewardOf(s.cafe.id)).toEqual({ status: 'ACTIVE', disabledReason: null });
      expect(await rewardOf(s.licuado.id)).toEqual({ status: 'ACTIVE', disabledReason: null });
      expect(await rewardOf(s.tostado.id)).toEqual({ status: 'INACTIVE', disabledReason: null });
      expect(await rewardOf(s.postre.id)).toEqual({ status: 'DISABLED', disabledReason: 'OUT_OF_STOCK' });
      expect(await rewardOf(s.combo.id)).toEqual({ status: 'DELETED', disabledReason: null });
    });

    it('a las 23:59 de Argentina del día anterior, la que vencía ese día sigue ACTIVE', async () => {
      const s = await seedScenario();

      // 06/11/2026 23:59 en Argentina: "Pizza" (vence el 06/11) todavía se puede canjear
      await availability.runDailyExpiration(new Date('2026-11-07T02:59:00.000Z'));

      expect(await rewardOf(s.pizza.id)).toEqual({ status: 'ACTIVE', disabledReason: null });
      expect(await rewardOf(s.brunch.id)).toEqual({ status: 'DISABLED', disabledReason: 'EXPIRED' });
    });

    it('CA-37.5: correrlo dos veces no duplica auditorías', async () => {
      await seedScenario();

      await availability.runDailyExpiration(NOW);
      const second = await availability.runDailyExpiration(NOW);

      expect(second).toEqual({ disabled: 0, failures: [] });
      expect(await newAuditRows()).toHaveLength(2);
    });

    it('CA-37.5: dos corridas a la vez no deshabilitan la misma dos veces', async () => {
      await seedScenario();

      const [first, second] = await Promise.all([availability.runDailyExpiration(NOW), availability.runDailyExpiration(NOW)]);

      expect(first.failures).toEqual([]);
      expect(second.failures).toEqual([]);
      expect(first.disabled + second.disabled).toBe(2);
      expect(await newAuditRows()).toHaveLength(2);
    });

    it('CA-37.5: si la auditoría de una falla, se deshace solo esa y el resto sigue; se reintenta en la próxima', async () => {
      const s = await seedScenario();
      const record = auditService.record.bind(auditService);
      let calls = 0;
      jest.spyOn(auditService, 'record').mockImplementation(async (entry) => {
        calls += 1;
        if (calls === 1) throw new Error('auditoría caída');
        await record(entry);
      });

      const result = await availability.runDailyExpiration(NOW);

      expect(result.disabled).toBe(1);
      expect(result.failures).toHaveLength(1);
      const failedId = result.failures[0].rewardId;
      expect(await rewardOf(failedId)).toEqual({ status: 'ACTIVE', disabledReason: null });
      expect(await newAuditRows()).toHaveLength(1);

      jest.restoreAllMocks();
      expect(await availability.runDailyExpiration(NOW)).toEqual({ disabled: 1, failures: [] });
      expect([s.pizza.id, s.brunch.id]).toContain(failedId);
    });

    it('CA-37.6: los canjes Confirmados de una recompensa que vence no se tocan', async () => {
      const s = await seedScenario();
      const customer = await prisma.customer.create({
        data: { firstName: 'Carolina', lastName: 'Fernández', documentType: 'DNI', documentNumber: '38456001', email: 'carolina@example.com' },
      });
      const createdAt = new Date(NOW.getTime() - 5 * 60_000);
      const redemption = await prisma.redemption.create({
        data: {
          code: 'K7MP2X',
          customerId: customer.id,
          rewardId: s.pizza.id,
          rewardName: s.pizza.name,
          points: 150,
          origin: 'APP',
          createdAt,
          expiresAt: new Date(createdAt.getTime() + REDEMPTION_DURATION_MS),
        },
      });

      await availability.runDailyExpiration(NOW);

      expect(await rewardOf(s.pizza.id)).toEqual({ status: 'DISABLED', disabledReason: 'EXPIRED' });
      expect(await prisma.redemption.findUniqueOrThrow({ where: { id: redemption.id } })).toMatchObject({
        status: 'CONFIRMED',
        resolvedAt: null,
        rejectionReason: null,
      });
      expect((await newAuditRows()).some((row) => row.actionCode === 'REDEMPTION_REJECTED')).toBe(false);
    });
  });

  describe('reevaluarDisponibilidad (CA-37.1), como la van a llamar US-35 y US-42', () => {
    // Bloquea la recompensa, la deja como la dejaría la operación de quien llama y reevalúa, en una
    // transacción
    async function reevaluate(id: number, update: object = {}) {
      return await transactionRunner.run(async () => {
        if (Object.keys(update).length > 0) await prisma.reward.update({ where: { id }, data: update });
        const reward = await rewards.findById(id);
        if (!reward) throw new Error('reward not found');
        return await availability.reevaluarDisponibilidad(reward, HOY);
      });
    }

    it('ACTIVE que queda con stock 0 → "DISABLED" / OUT_OF_STOCK, "Motivo: Sin stock"', async () => {
      const s = await seedScenario();

      expect(await reevaluate(s.licuado.id, { stock: 0 })).toBe('DISABLED');

      expect(await rewardOf(s.licuado.id)).toEqual({ status: 'DISABLED', disabledReason: 'OUT_OF_STOCK' });
      expect((await newAuditRows())[0]).toMatchObject({
        actionCode: 'REWARD_DISABLED',
        description: 'Deshabilitó la recompensa "Licuado"',
        details: [{ label: 'Motivo', value: 'Sin stock' }],
      });
    });

    it('DISABLED / OUT_OF_STOCK que repone stock → "ENABLED", "Motivo: Stock repuesto"', async () => {
      const s = await seedScenario();
      await prisma.reward.update({ where: { id: s.licuado.id }, data: { status: 'DISABLED', disabledReason: 'OUT_OF_STOCK', stock: 0 } });

      expect(await reevaluate(s.licuado.id, { stock: 10 })).toBe('ENABLED');

      expect(await rewardOf(s.licuado.id)).toEqual({ status: 'ACTIVE', disabledReason: null });
      expect((await newAuditRows())[0]).toMatchObject({
        actorType: 'SYSTEM',
        actionCode: 'REWARD_ENABLED',
        description: 'Habilitó la recompensa "Licuado"',
        details: [{ label: 'Motivo', value: 'Stock repuesto' }],
      });
    });

    it('DISABLED / EXPIRED que pasa a "No vence" → "ENABLED", "Motivo: Fecha de vencimiento actualizada"', async () => {
      const s = await seedScenario();
      await availability.runDailyExpiration(NOW);
      lastAuditId = (await prisma.auditLog.findFirst({ orderBy: { id: 'desc' } }))?.id ?? 0;

      expect(await reevaluate(s.pizza.id, { expiresAt: null })).toBe('ENABLED');

      expect(await rewardOf(s.pizza.id)).toEqual({ status: 'ACTIVE', disabledReason: null });
      expect((await newAuditRows())[0].details).toEqual([{ label: 'Motivo', value: 'Fecha de vencimiento actualizada' }]);
    });

    it('(b) "Agotada" que además venció y repone stock: sigue DISABLED pero pasa a EXPIRED, y se audita', async () => {
      const s = await seedScenario();

      expect(await reevaluate(s.postre.id, { stock: 10 })).toBeNull();

      expect(await rewardOf(s.postre.id)).toEqual({ status: 'DISABLED', disabledReason: 'EXPIRED' });
      expect((await newAuditRows())[0]).toMatchObject({
        actionCode: 'REWARD_DISABLED',
        details: [{ label: 'Motivo', value: 'Vencida' }],
      });
    });

    it('INACTIVE sin stock: no cambia y no audita', async () => {
      const s = await seedScenario();

      expect(await reevaluate(s.tostado.id, { stock: 0 })).toBeNull();

      expect(await rewardOf(s.tostado.id)).toEqual({ status: 'INACTIVE', disabledReason: null });
      expect(await newAuditRows()).toHaveLength(0);
    });

    it('si la operación de quien llama se deshace, el cambio de disponibilidad también', async () => {
      const s = await seedScenario();

      await expect(
        transactionRunner.run(async () => {
          await prisma.reward.update({ where: { id: s.licuado.id }, data: { stock: 0 } });
          const reward = await rewards.findById(s.licuado.id);
          if (reward) await availability.reevaluarDisponibilidad(reward, HOY);
          throw new Error('falló la edición');
        }),
      ).rejects.toThrow('falló la edición');

      expect(await rewardOf(s.licuado.id)).toEqual({ status: 'ACTIVE', disabledReason: null });
      expect(await newAuditRows()).toHaveLength(0);
    });
  });
});
