import request from 'supertest';
import { art, asAdmin, createStatisticsApp, monthAgo, StatisticsSeeder, type StatisticsTestApp } from './statistics-helpers.js';
import { toArgentinaParts } from '../src/shared/time/argentina-date.js';

const URL = '/api/estadisticas/puntos';
const KEYS = ['awarded', 'bonus', 'birthdayBonus', 'expired', 'missionRewards', 'redeemed', 'voided'].sort();

// US-53 (CA-53.1 y CA-53.4, contrato S5 §3.9.3) contra Postgres real: los siete totales del mes por tipo de
// movimiento y los mismos siete del mes anterior en `previousMonth` (en el mes en curso, los mismos días).
describe('GET /api/estadisticas/puntos (e2e, US-53)', () => {
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
    const customerId = await seeder.customer();
    const rewardId = await seeder.reward('Café + medialuna');
    const missionId = await seeder.mission('Tres consumos');
    // Todo m1 va el día 1 (que siempre entra en "los mismos días" del mes en curso), salvo el consumo del último día
    const day1 = (hour: number, minute = 0) => art(m1.year, m1.month, 1, hour, minute);

    // Primer consumo: 15 pts + 5 de bonificación → un solo movimiento de 20
    await seeder.consumption({ customerId, createdAt: day1(12), points: 15, bonusPoints: 5 });
    // Consumo anulado en el mismo mes: su crédito (10) sigue en "acreditados" y la anulación suma 10 en "anulados"
    await seeder.consumption({ customerId, createdAt: day1(11), points: 10, voidedAt: day1(12, 30) });
    await seeder.consumption({ customerId, createdAt: art(m1.year, m1.month, m1.lastDay, 12), points: 30 });
    await seeder.customerMission({ missionId, customerId, period: `${m1.value}-01`, status: 'CLAIMED' });
    const customerMission = await ctx.prisma.customerMission.findFirstOrThrow({ where: { customerId } });
    await seeder.movement({ customerId, type: 'MISSION_REWARD', points: 50, createdAt: day1(13), customerMissionId: customerMission.id });
    await seeder.movement({ customerId, type: 'BIRTHDAY_BONUS', points: 100, createdAt: day1(14) });
    await seeder.usedRedemption({ customerId, rewardId, rewardName: 'Café + medialuna', usedAt: day1(15) });
    await seeder.movement({ customerId, type: 'EXPIRATION', points: -40, createdAt: day1(16) });
    // Los ajustes no se muestran (S5-42)
    await seeder.movement({ customerId, type: 'MANUAL_ADJUSTMENT', points: 25, createdAt: day1(17) });

    // m2 (el mes anterior de m1): un consumo de 100, otro de 900 a las 23:59 del último día y un vencimiento de 7
    await seeder.consumption({ customerId, createdAt: art(m2.year, m2.month, 10), points: 100 });
    await seeder.consumption({ customerId, createdAt: art(m2.year, m2.month, m2.lastDay, 23, 59), points: 900 });
    await seeder.movement({ customerId, type: 'EXPIRATION', points: -7, createdAt: art(m2.year, m2.month, 3) });

    // m0: un consumo a las 00:00 del día 1 (no es de m1) y otro de hace un minuto
    await seeder.consumption({ customerId, createdAt: art(m0.year, m0.month, 1, 0, 0), points: 888 });
    await seeder.consumption({ customerId, createdAt: new Date(Date.now() - 60 * 1000), points: 10 });
  });

  it('un mes cerrado: los siete totales por tipo y los del mes anterior completo (CA-53.1)', async () => {
    const response = await request(ctx.app.getHttpServer()).get(`${URL}?month=${m1.value}`).set(asAdmin);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      // 15 + 10 (anulado, su crédito igual cuenta) + 30; el consumo de las 00:00 de m0 y el de m2 no
      awarded: 55,
      bonus: 5,
      missionRewards: 50,
      birthdayBonus: 100,
      redeemed: 150,
      expired: 40,
      voided: 10,
      // m2 completo: 100 + 900, vencimiento de 7
      previousMonth: { awarded: 1000, bonus: 0, missionRewards: 0, birthdayBonus: 0, redeemed: 0, expired: 7, voided: 0 },
    });
  });

  it('el mes en curso se compara contra los MISMOS DÍAS del mes anterior (S5-52)', async () => {
    const response = await request(ctx.app.getHttpServer()).get(`${URL}?month=${m0.value}`).set(asAdmin);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ awarded: 898, bonus: 0, missionRewards: 0, birthdayBonus: 0, redeemed: 0, expired: 0, voided: 0 });
    // Del 1 al día de hoy de m1: todo lo del día 1 y, solo si hoy ya es el último día de m1 o más, el consumo de 30
    const todayDay = toArgentinaParts(new Date()).day;
    const lastDayIncluded = todayDay >= m1.lastDay;
    expect(response.body.previousMonth).toEqual({
      awarded: 25 + (lastDayIncluded ? 30 : 0),
      bonus: 5,
      missionRewards: 50,
      birthdayBonus: 100,
      redeemed: 150,
      expired: 40,
      voided: 10,
    });
  });

  it('un mes sin movimientos: todo en 0, y sin ajustes ni byMonth (S5-42)', async () => {
    const response = await request(ctx.app.getHttpServer()).get(`${URL}?month=${monthAgo(5).value}`).set(asAdmin);

    expect(response.status).toBe(200);
    const zeros = Object.fromEntries(KEYS.map((key) => [key, 0]));
    expect(response.body).toEqual({ ...zeros, previousMonth: zeros });
    expect(Object.keys(response.body).sort()).toEqual([...KEYS, 'previousMonth'].sort());
    expect(Object.keys(response.body.previousMonth).sort()).toEqual(KEYS);
  });

  it('enero del año pasado: el mes anterior es anterior al límite y igual se calcula', async () => {
    const lastYear = new Date().getUTCFullYear() - 1;
    const response = await request(ctx.app.getHttpServer()).get(`${URL}?month=${lastYear}-01`).set(asAdmin);

    expect(response.status).toBe(200);
    expect(Object.keys(response.body.previousMonth).sort()).toEqual(KEYS);
  });
});
