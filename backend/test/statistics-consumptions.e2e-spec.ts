import request from 'supertest';
import { art, asAdmin, createStatisticsApp, monthAgo, StatisticsSeeder, type StatisticsTestApp } from './statistics-helpers.js';

const URL = '/api/estadisticas/consumos';

// 1 = lunes … 7 = domingo, del día `day` de un mes
const isoWeekday = (year: number, month: number, day: number): number => new Date(Date.UTC(year, month - 1, day)).getUTCDay() || 7;

// US-52 (CA-52.1 a CA-52.3, contrato S5 §3.9.2) contra Postgres real: totales del mes, por día de la semana (los 7) y
// por las cinco franjas, en hora de Argentina, solo consumos REGISTERED.
describe('GET /api/estadisticas/consumos (e2e, US-52)', () => {
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

  // El primer día del mes m1 que cae en ese día de la semana
  const dayOf = (isoDay: number): number => {
    for (let day = 1; day <= 7; day++) {
      if (isoWeekday(m1.year, m1.month, day) === isoDay) return day;
    }
    throw new Error('no puede pasar: una semana tiene los siete días');
  };
  const monday = dayOf(1);
  const tuesday = dayOf(2);
  const wednesday = dayOf(3);
  const sunday = dayOf(7);

  // Consumos de m1 que cuentan: weekday y franja (0 a 4) esperados, calculados a mano
  const counted = [
    { at: art(m1.year, m1.month, monday, 11, 59), amount: 1000.5, weekday: 1, slot: 1 },
    { at: art(m1.year, m1.month, monday, 12, 0), amount: 2000, weekday: 1, slot: 2 },
    { at: art(m1.year, m1.month, tuesday, 0, 0), amount: 500, weekday: 2, slot: 0 },
    { at: art(m1.year, m1.month, tuesday, 7, 59), amount: 100, weekday: 2, slot: 0 },
    { at: art(m1.year, m1.month, sunday, 23, 59), amount: 300, weekday: 7, slot: 4 },
    { at: art(m1.year, m1.month, wednesday, 20, 0), amount: 400, weekday: 3, slot: 4 },
    { at: art(m1.year, m1.month, wednesday, 19, 59), amount: 50, weekday: 3, slot: 3 },
    // 22:00 del último día en Argentina = 01:00 UTC del mes siguiente: igual es de m1
    {
      at: art(m1.year, m1.month, m1.lastDay, 22, 0),
      amount: 600,
      weekday: isoWeekday(m1.year, m1.month, m1.lastDay),
      slot: 4,
    },
  ];

  beforeEach(async () => {
    await ctx.resetDatabase();
    seeder = new StatisticsSeeder(ctx.prisma, ctx.actor);
    const customerId = await seeder.customer();

    for (const row of counted) {
      await seeder.consumption({ customerId, createdAt: row.at, amount: row.amount });
    }
    // No cuentan: anulado, del mes anterior (23:59 del último día) y de m0 (00:00 del día 1)
    await seeder.consumption({ customerId, createdAt: art(m1.year, m1.month, monday, 10, 0), amount: 9999, voidedAt: art(m1.year, m1.month, monday, 11, 0) });
    await seeder.consumption({ customerId, createdAt: art(m2.year, m2.month, m2.lastDay, 23, 59), amount: 7777 });
    await seeder.consumption({ customerId, createdAt: art(m0.year, m0.month, 1, 0, 0), amount: 8888 });
  });

  it('totales, los 7 días y las 5 franjas con datos conocidos; solo REGISTERED (CA-52.1 a CA-52.3)', async () => {
    const response = await request(ctx.app.getHttpServer()).get(`${URL}?month=${m1.value}`).set(asAdmin);

    expect(response.status).toBe(200);
    expect(response.body.total).toEqual({ count: 8, amount: 4950.5 });

    expect(response.body.byWeekday).toHaveLength(7);
    expect(response.body.byWeekday.map((row: { weekday: number }) => row.weekday)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    const expectedByWeekday = [1, 2, 3, 4, 5, 6, 7].map((weekday) => {
      const rows = counted.filter((row) => row.weekday === weekday);
      return { weekday, count: rows.length, amount: rows.reduce((sum, row) => sum + row.amount, 0) };
    });
    expect(response.body.byWeekday).toEqual(expectedByWeekday);
    // Jueves y viernes no tienen consumos (salvo que el último día del mes caiga en uno): vienen igual, en 0 o con lo suyo
    expect(response.body.byWeekday[0].count).toBeGreaterThanOrEqual(2);

    expect(response.body.byTimeSlot).toHaveLength(5);
    const slots = [
      { from: '00:00', to: '08:00' },
      { from: '08:00', to: '12:00' },
      { from: '12:00', to: '16:00' },
      { from: '16:00', to: '20:00' },
      { from: '20:00', to: '24:00' },
    ];
    const expectedByTimeSlot = slots.map((slot, index) => {
      const rows = counted.filter((row) => row.slot === index);
      return { ...slot, count: rows.length, amount: rows.reduce((sum, row) => sum + row.amount, 0) };
    });
    expect(response.body.byTimeSlot).toEqual(expectedByTimeSlot);
    // 11:59 cae en 08–12 y 12:00 en 12–16; 07:59 en 00–08; 19:59 en 16–20 y 20:00 en 20–24
    expect(response.body.byTimeSlot[1]).toEqual({ from: '08:00', to: '12:00', count: 1, amount: 1000.5 });
    expect(response.body.byTimeSlot[2]).toEqual({ from: '12:00', to: '16:00', count: 1, amount: 2000 });
    expect(response.body.byTimeSlot[0]).toEqual({ from: '00:00', to: '08:00', count: 2, amount: 600 });
    expect(response.body.byTimeSlot[3]).toEqual({ from: '16:00', to: '20:00', count: 1, amount: 50 });
    expect(response.body.byTimeSlot[4]).toEqual({ from: '20:00', to: '24:00', count: 3, amount: 1300 });
  });

  it('un mes sin consumos trae los 7 días y las 5 franjas en 0', async () => {
    const response = await request(ctx.app.getHttpServer()).get(`${URL}?month=${monthAgo(5).value}`).set(asAdmin);

    expect(response.status).toBe(200);
    expect(response.body.total).toEqual({ count: 0, amount: 0 });
    expect(response.body.byWeekday).toHaveLength(7);
    expect(response.body.byWeekday.every((row: { count: number; amount: number }) => row.count === 0 && row.amount === 0)).toBe(true);
    expect(response.body.byTimeSlot).toHaveLength(5);
    expect(response.body.byTimeSlot.every((row: { count: number; amount: number }) => row.count === 0 && row.amount === 0)).toBe(true);
  });

  it('el mes en curso trae lo que va del mes (el consumo de las 00:00 del día 1 entra)', async () => {
    const response = await request(ctx.app.getHttpServer()).get(`${URL}?month=${m0.value}`).set(asAdmin);

    expect(response.status).toBe(200);
    expect(response.body.total).toEqual({ count: 1, amount: 8888 });
  });

  it('forma exacta: total, byWeekday y byTimeSlot, sin groupBy ni por período (S5-42)', async () => {
    const response = await request(ctx.app.getHttpServer()).get(`${URL}?month=${m1.value}`).set(asAdmin);

    expect(Object.keys(response.body).sort()).toEqual(['byTimeSlot', 'byWeekday', 'total']);
    expect(Object.keys(response.body.byWeekday[0]).sort()).toEqual(['amount', 'count', 'weekday']);
    expect(Object.keys(response.body.byTimeSlot[0]).sort()).toEqual(['amount', 'count', 'from', 'to']);
  });
});
