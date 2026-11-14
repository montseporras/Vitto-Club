import request from 'supertest';
import { art, asAdmin, createStatisticsApp, monthAgo, StatisticsSeeder, type StatisticsTestApp } from './statistics-helpers.js';

const URL = '/api/estadisticas/clientes';

// US-51 (CA-51.1, contrato S5 §3.9.1) contra Postgres real, con datos conocidos de un mes cerrado (el anterior) y
// del mes en curso. Las fechas salen de monthAgo(): los tests no dependen del día en que corren.
describe('GET /api/estadisticas/clientes (e2e, US-51)', () => {
  let ctx: StatisticsTestApp;
  let seeder: StatisticsSeeder;
  const m0 = monthAgo(0);
  const m1 = monthAgo(1);
  const m2 = monthAgo(2);
  const m3 = monthAgo(3);

  beforeAll(async () => {
    ctx = await createStatisticsApp();
  });
  afterAll(async () => {
    await ctx.close();
  });

  // Todas las fechas en hora de Argentina, el día 3 al 20 de cada mes (existen en todos los meses)
  const consume = (customerId: number, month: { year: number; month: number }, count: number, firstDay = 10) =>
    Promise.all(
      Array.from({ length: count }, (_, index) =>
        seeder.consumption({ customerId, createdAt: art(month.year, month.month, firstDay + index) }),
      ),
    );

  beforeEach(async () => {
    await ctx.resetDatabase();
    seeder = new StatisticsSeeder(ctx.prisma, ctx.actor);

    // A: nueva en m1 con 3 consumos en m1 → nueva, frecuente y llegó al mínimo en su mes
    const a = await seeder.customer({ createdAt: art(m1.year, m1.month, 3) });
    await consume(a, m1, 3);
    // B: de m2, 2 consumos en m1 → activa, no frecuente
    const b = await seeder.customer({ createdAt: art(m2.year, m2.month, 10) });
    await consume(b, m1, 2);
    // C: de m3, 4 consumos en m1 → frecuente
    const c = await seeder.customer({ createdAt: art(m3.year, m3.month, 10) });
    await consume(c, m1, 4);
    // D: nueva en m1 con 2 consumos en m1 y 1 en el mes en curso → llegaría a 3 pero repartidos en dos meses
    const d = await seeder.customer({ createdAt: art(m1.year, m1.month, 5) });
    await consume(d, m1, 2);
    await seeder.consumption({ customerId: d, createdAt: new Date(Date.now() - 60 * 1000) });
    // E: nueva en m1 y dada de baja en m1 → nueva, pero no activa al cierre
    await seeder.customer({ createdAt: art(m1.year, m1.month, 7), deactivatedAt: art(m1.year, m1.month, 20) });
    // F: de m2, dada de baja en el mes en curso → al cierre de m1 todavía estaba activa
    await seeder.customer({ createdAt: art(m2.year, m2.month, 12), deactivatedAt: new Date(Date.now() - 60 * 1000) });
    // G: nueva en m1 con 3 consumos, uno anulado → solo 2 REGISTERED
    const g = await seeder.customer({ createdAt: art(m1.year, m1.month, 8) });
    await consume(g, m1, 2);
    await seeder.consumption({ customerId: g, createdAt: art(m1.year, m1.month, 15), voidedAt: art(m1.year, m1.month, 16) });
    // I: de m2 con 1 consumo en m2 y 2 en m1 → 3 repartidos en dos meses: no llegó al mínimo en su mes de alta
    const i = await seeder.customer({ createdAt: art(m2.year, m2.month, 9) });
    await consume(i, m2, 1, 11);
    await consume(i, m1, 2);
    // K: de m2 con 3 consumos en m2 → llegó al mínimo en su mes de alta
    const k = await seeder.customer({ createdAt: art(m2.year, m2.month, 6) });
    await consume(k, m2, 3, 7);
  });

  it('un mes cerrado: activos al cierre, nuevos, frecuentes (mínimo 3) y los 6 meses con newFrequent (CA-51.1)', async () => {
    const response = await request(ctx.app.getHttpServer()).get(`${URL}?month=${m1.value}`).set(asAdmin);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      // A, B, C, D, F, G, I, K (E se dio de baja en el mes; Cora se registró después)
      active: 8,
      // A, D, E, G
      new: 4,
      // A (3) y C (4); B, D, G, I tienen 2
      frequent: 2,
      frequentMinConsumptions: 3,
      last6Months: [
        { month: monthAgo(6).value, new: 0, newFrequent: 0 },
        { month: monthAgo(5).value, new: 0, newFrequent: 0 },
        { month: monthAgo(4).value, new: 0, newFrequent: 0 },
        // C
        { month: m3.value, new: 1, newFrequent: 0 },
        // B, F, I y K; solo K llegó a 3 en su mes (I tiene 3 repartidos en dos meses)
        { month: m2.value, new: 4, newFrequent: 1 },
        // A, D, E y G; solo A llegó a 3 en su mes
        { month: m1.value, new: 4, newFrequent: 1 },
      ],
    });
  });

  it('el mes en curso trae lo que va del mes: activos de hoy y nuevos del mes', async () => {
    const response = await request(ctx.app.getHttpServer()).get(`${URL}?month=${m0.value}`).set(asAdmin);

    expect(response.status).toBe(200);
    // Activos hoy: A, B, C, D, G, I, K y Cora (E y F están dadas de baja). Nueva en el mes: solo Cora.
    expect(response.body).toMatchObject({ active: 8, new: 1, frequent: 0, frequentMinConsumptions: 3 });
    expect(response.body.last6Months).toHaveLength(6);
    expect(response.body.last6Months[5]).toEqual({ month: m0.value, new: 1, newFrequent: 0 });
    expect(response.body.last6Months[0].month).toBe(monthAgo(5).value);
  });

  it('el mínimo configurado cambia frecuentes y conversión (S5-22, S5-53)', async () => {
    await ctx.prisma.loyaltyProgramConfiguration.updateMany({ data: { isActive: false, validTo: new Date() } });
    await ctx.prisma.loyaltyProgramConfiguration.create({
      data: { version: 2, baseAmount: 1000, pointsAwarded: 10, pointsExpirationMonths: 12, frequentMinConsumptions: 2, isActive: true },
    });

    const response = await request(ctx.app.getHttpServer()).get(`${URL}?month=${m1.value}`).set(asAdmin);

    expect(response.status).toBe(200);
    // A (3), B (2), C (4), D (2), G (2) e I (2)
    expect(response.body.frequent).toBe(6);
    expect(response.body.frequentMinConsumptions).toBe(2);
    // De los nuevos de m1: A (3), D (2) y G (2); E no tiene consumos
    expect(response.body.last6Months[5]).toEqual({ month: m1.value, new: 4, newFrequent: 3 });
  });

  it('forma exacta: solo los cinco campos del contrato (sin withConsumptions)', async () => {
    const response = await request(ctx.app.getHttpServer()).get(`${URL}?month=${m1.value}`).set(asAdmin);

    expect(Object.keys(response.body).sort()).toEqual(['active', 'frequent', 'frequentMinConsumptions', 'last6Months', 'new']);
    expect(Object.keys(response.body.last6Months[0]).sort()).toEqual(['month', 'new', 'newFrequent']);
  });
});
