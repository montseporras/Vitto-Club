import request from 'supertest';
import { art, asAdmin, createStatisticsApp, monthAgo, StatisticsSeeder, type StatisticsTestApp } from './statistics-helpers.js';

const URL = '/api/estadisticas/programa';

// US-54 (CA-54.1 a CA-54.4, contrato S5 §3.9.4) contra Postgres real: niveles actuales, subidas de nivel del mes,
// misiones del mes por estado y recompensas más canjeadas.
describe('GET /api/estadisticas/programa (e2e, US-54)', () => {
  let ctx: StatisticsTestApp;
  let seeder: StatisticsSeeder;
  const m0 = monthAgo(0);
  const m1 = monthAgo(1);
  const m2 = monthAgo(2);

  beforeAll(async () => {
    ctx = await createStatisticsApp();
  });
  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await ctx.resetDatabase();
    seeder = new StatisticsSeeder(ctx.prisma, ctx.actor);
  });

  describe('niveles y subidas de nivel (CA-54.1 y CA-54.2, S5-47)', () => {
    beforeEach(async () => {
      // Los umbrales cambiaron a mitad de m1: antes Plata 200 y Oro 500; desde el día 15, Plata 300 y Oro 800
      await ctx.prisma.loyaltyProgramConfiguration.updateMany({
        where: { version: 1 },
        data: { silverMinPoints: 200, goldMinPoints: 500, isActive: false, validFrom: art(m2.year, m2.month, 1), validTo: art(m1.year, m1.month, 15) },
      });
      await ctx.prisma.loyaltyProgramConfiguration.create({
        data: {
          version: 2,
          baseAmount: 1000,
          pointsAwarded: 10,
          pointsExpirationMonths: 12,
          silverMinPoints: 300,
          goldMinPoints: 800,
          isActive: true,
          validFrom: art(m1.year, m1.month, 15),
        },
      });
    });

    // lifetimePoints actual de cada cliente (el que guarda customer_points) y sus movimientos que lo cambian
    async function customerWith(options: { lifetime: number; createdAt?: Date; deactivatedAt?: Date }): Promise<number> {
      return seeder.customer({ lifetimePoints: options.lifetime, createdAt: options.createdAt ?? art(m2.year, m2.month, 1), deactivatedAt: options.deactivatedAt });
    }

    it('cuenta a los que pasaron a un nivel más alto con los umbrales vigentes al inicio y al final del mes', async () => {
      const at = (day: number) => art(m1.year, m1.month, day);
      // P: 250 → 350. Plata (≥200) al empezar y Plata (≥300) al terminar: NO subió, aunque con los umbrales de hoy sí lo parecería
      const p = await customerWith({ lifetime: 350 });
      await seeder.consumption({ customerId: p, createdAt: at(10), points: 100 });
      // Q: 0 → 350: Bronce a Plata, subió
      const q = await customerWith({ lifetime: 350 });
      await seeder.consumption({ customerId: q, createdAt: at(10), points: 350 });
      // R: 700 → 850. Oro (≥500) al empezar y Oro (≥800) al terminar: NO subió
      const r = await customerWith({ lifetime: 850 });
      await seeder.consumption({ customerId: r, createdAt: at(10), points: 150 });
      // S: 400 → 200 por una anulación: bajó, no subió
      const s = await customerWith({ lifetime: 200 });
      await seeder.consumption({ customerId: s, createdAt: art(m2.year, m2.month, 5), points: 200, voidedAt: at(12) });
      // T: cliente nuevo de m1 con 300: Bronce (0) a Plata, subió
      const t = await customerWith({ lifetime: 300, createdAt: at(3) });
      await seeder.consumption({ customerId: t, createdAt: at(4), points: 300 });
      // U: dado de baja en m1: no cuenta aunque haya subido
      const u = await customerWith({ lifetime: 400, deactivatedAt: at(20) });
      await seeder.consumption({ customerId: u, createdAt: at(10), points: 400 });
      // V: puntos de regalo de misión no cambian el nivel (S5-9): 100 antes y después
      const v = await customerWith({ lifetime: 100 });
      await seeder.movement({ customerId: v, type: 'MISSION_REWARD', points: 500, createdAt: at(10), customerMissionId: await missionOf(v, m1.value) });
      // W: 100 al terminar m1; en m0 sumó 800 (900 hoy): lo de después del mes no cuenta
      const w = await customerWith({ lifetime: 900 });
      await seeder.consumption({ customerId: w, createdAt: art(m1.year, m1.month, 2), points: 100 });
      await seeder.consumption({ customerId: w, createdAt: art(m0.year, m0.month, 1, 0, 0), points: 800 });
      // Cora (la de la base) se registró después de m1: no está

      const response = await request(ctx.app.getHttpServer()).get(`${URL}?month=${m1.value}`).set(asAdmin);

      expect(response.status).toBe(200);
      expect(response.body.levelUps).toBe(2);
      // Nivel actual (umbrales de hoy, 300 y 800) de los activos: Bronce S, V, Cora; Plata P, Q, T; Oro R, W. U está de baja.
      expect(response.body.levels).toEqual([
        { level: 'BRONZE', customers: 3 },
        { level: 'SILVER', customers: 3 },
        { level: 'GOLD', customers: 2 },
      ]);
    });

    async function missionOf(customerId: number, monthValue: string): Promise<number> {
      const missionId = await seeder.mission(`Misión de ${customerId}`);
      await seeder.customerMission({ missionId, customerId, period: `${monthValue}-01`, status: 'CLAIMED' });
      return (await ctx.prisma.customerMission.findFirstOrThrow({ where: { customerId, missionId } })).id;
    }
  });

  describe('misiones del mes (CA-54.3)', () => {
    it('cuenta las asignaciones del mes por estado; completed no incluye las reclamadas; assigned es la suma', async () => {
      const customerId = await seeder.customer();
      const seedStatuses = async (period: string, statuses: ('IN_PROGRESS' | 'COMPLETED' | 'CLAIMED' | 'EXPIRED')[]) => {
        for (const [index, status] of statuses.entries()) {
          const missionId = await seeder.mission(`Misión ${period} ${index}`);
          await seeder.customerMission({ missionId, customerId, period, status });
        }
      };
      await seedStatuses(`${m1.value}-01`, ['COMPLETED', 'COMPLETED', 'CLAIMED', 'CLAIMED', 'CLAIMED', 'EXPIRED', 'EXPIRED', 'EXPIRED', 'EXPIRED']);
      await seedStatuses(`${m0.value}-01`, ['IN_PROGRESS', 'IN_PROGRESS', 'IN_PROGRESS', 'IN_PROGRESS', 'IN_PROGRESS', 'COMPLETED']);

      const closed = await request(ctx.app.getHttpServer()).get(`${URL}?month=${m1.value}`).set(asAdmin);
      const current = await request(ctx.app.getHttpServer()).get(`${URL}?month=${m0.value}`).set(asAdmin);

      expect(closed.body.missions).toEqual({ assigned: 9, inProgress: 0, completed: 2, claimed: 3, expired: 4 });
      expect(current.body.missions).toEqual({ assigned: 6, inProgress: 5, completed: 1, claimed: 0, expired: 0 });
      const empty = await request(ctx.app.getHttpServer()).get(`${URL}?month=${monthAgo(4).value}`).set(asAdmin);
      expect(empty.body.missions).toEqual({ assigned: 0, inProgress: 0, completed: 0, claimed: 0, expired: 0 });
    });
  });

  describe('recompensas más canjeadas (CA-54.4, S5-48)', () => {
    it('top por canjes USED del mes, con el nombre del snapshot, empate por id, incluye dadas de baja y redemptionsUsed', async () => {
      const customerId = await seeder.customer();
      const reward = (name: string) => seeder.reward(name);
      const a = await reward('Café + medialuna');
      const b = await reward('Té');
      const c = await reward('Alfajor');
      const d = await reward('Budín');
      await ctx.prisma.reward.update({ where: { id: d }, data: { status: 'DELETED', deletedAt: new Date() } });
      const use = (rewardId: number, rewardName: string, day: number, hour = 12) =>
        seeder.usedRedemption({ customerId, rewardId, rewardName, usedAt: art(m1.year, m1.month, day, hour) });

      // A: 3 usos; el nombre cambió: se toma el del canje más reciente del mes
      await use(a, 'Café', 2);
      await use(a, 'Café', 3);
      await use(a, 'Café + medialuna', 4);
      await use(b, 'Té', 5);
      await use(b, 'Té', 6);
      await use(c, 'Alfajor', 7);
      await use(c, 'Alfajor', 8);
      await use(d, 'Budín', 9);
      // No cuentan: un uso de m2 y un canje solo confirmado (no usado)
      await seeder.usedRedemption({ customerId, rewardId: a, rewardName: 'Café + medialuna', usedAt: art(m2.year, m2.month, 20) });
      const createdAt = art(m1.year, m1.month, 10);
      await ctx.prisma.redemption.create({
        data: {
          code: 'ZZZZZ2',
          customerId,
          rewardId: a,
          rewardName: 'Café + medialuna',
          points: 150,
          status: 'CONFIRMED',
          origin: 'APP',
          createdAt,
          expiresAt: new Date(createdAt.getTime() + 15 * 60 * 1000),
        },
      });

      const response = await request(ctx.app.getHttpServer()).get(`${URL}?month=${m1.value}`).set(asAdmin);

      expect(response.status).toBe(200);
      expect(response.body.topRewards).toEqual([
        { id: a, name: 'Café + medialuna', used: 3 },
        { id: b, name: 'Té', used: 2 },
        { id: c, name: 'Alfajor', used: 2 },
        { id: d, name: 'Budín', used: 1 },
      ]);
      expect(response.body.redemptionsUsed).toBe(8);
    });

    it('trae solo las 10 más canjeadas, y redemptionsUsed es el total de todas', async () => {
      const customerId = await seeder.customer();
      for (let index = 1; index <= 12; index++) {
        const rewardId = await seeder.reward(`Recompensa ${index}`);
        await seeder.usedRedemption({ customerId, rewardId, rewardName: `Recompensa ${index}`, usedAt: art(m1.year, m1.month, 5, index) });
      }

      const response = await request(ctx.app.getHttpServer()).get(`${URL}?month=${m1.value}`).set(asAdmin);

      expect(response.body.topRewards).toHaveLength(10);
      expect(response.body.redemptionsUsed).toBe(12);
    });

    it('un mes sin canjes: lista vacía y 0', async () => {
      const response = await request(ctx.app.getHttpServer()).get(`${URL}?month=${m1.value}`).set(asAdmin);

      expect(response.body.topRewards).toEqual([]);
      expect(response.body.redemptionsUsed).toBe(0);
    });
  });

  it('forma exacta de la respuesta (§3.9.4)', async () => {
    const response = await request(ctx.app.getHttpServer()).get(`${URL}?month=${m1.value}`).set(asAdmin);

    expect(response.status).toBe(200);
    expect(Object.keys(response.body).sort()).toEqual(['levelUps', 'levels', 'missions', 'redemptionsUsed', 'topRewards']);
    expect(response.body.levels.map((row: { level: string }) => row.level)).toEqual(['BRONZE', 'SILVER', 'GOLD']);
    expect(Object.keys(response.body.missions).sort()).toEqual(['assigned', 'claimed', 'completed', 'expired', 'inProgress']);
  });
});
