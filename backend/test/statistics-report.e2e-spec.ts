import request from 'supertest';
import { pdfPageCount, pdfText } from './pdf-text.js';
import { art, asAdmin, createStatisticsApp, monthAgo, StatisticsSeeder, type StatisticsTestApp } from './statistics-helpers.js';

// Armar un PDF con PDFKit tarda; con la suite completa en marcha el límite de 5 s por defecto puede quedar justo
jest.setTimeout(30000);

const monthName = (value: string) =>
  ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][Number(value.slice(5, 7)) - 1];

// US-55 (CA-55.1 y CA-55.2, contrato S5 §3.9.5) contra Postgres real: el PDF trae el logo, el mes, la fecha de
// generación y solo las secciones pedidas, en el orden Clientes · Consumos · Puntos · Programa.
describe('GET /api/estadisticas/reporte.pdf (e2e, US-55)', () => {
  let ctx: StatisticsTestApp;
  const m0 = monthAgo(0);
  const m1 = monthAgo(1);

  beforeAll(async () => {
    ctx = await createStatisticsApp();
    await ctx.resetDatabase();
    const seeder = new StatisticsSeeder(ctx.prisma, ctx.actor);
    // Algunos datos en m1 para que las tablas no estén vacías
    const customerId = await seeder.customer({ createdAt: art(m1.year, m1.month, 3), lifetimePoints: 350 });
    for (let day = 10; day < 13; day++) {
      await seeder.consumption({ customerId, createdAt: art(m1.year, m1.month, day), amount: 1550, points: 15 });
    }
    const rewardId = await seeder.reward('Café + medialuna');
    await seeder.usedRedemption({ customerId, rewardId, rewardName: 'Café + medialuna', usedAt: art(m1.year, m1.month, 14) });
  });
  afterAll(async () => {
    await ctx.close();
  });

  const getPdf = (query: string) =>
    request(ctx.app.getHttpServer())
      .get(`/api/estadisticas/reporte.pdf${query}`)
      .set(asAdmin)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });
  const getJson = async (endpoint: string, month: string) =>
    (await request(ctx.app.getHttpServer()).get(`/api/estadisticas/${endpoint}?month=${month}`).set(asAdmin)).body;

  it('responde application/pdf, con el nombre del contrato, y es un PDF válido (CA-55.1)', async () => {
    const response = await getPdf(`?month=${m1.value}&sections=CUSTOMERS,CONSUMPTIONS,POINTS,PROGRAM`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.headers['content-disposition']).toBe(
      `attachment; filename="vitto-club-reporte-${m1.value}-01-${m1.value}-${String(m1.lastDay).padStart(2, '0')}.pdf"`,
    );
    const buffer = response.body as Buffer;
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buffer.subarray(-8).toString()).toContain('%%EOF');
    expect(pdfPageCount(buffer)).toBeGreaterThanOrEqual(1);
  });

  it('el nombre lleva siempre el mes entero, también en el mes en curso', async () => {
    const response = await getPdf(`?month=${m0.value}&sections=POINTS`);

    expect(response.status).toBe(200);
    expect(response.headers['content-disposition']).toBe(
      `attachment; filename="vitto-club-reporte-${m0.value}-01-${m0.value}-${String(m0.lastDay).padStart(2, '0')}.pdf"`,
    );
  });

  it('trae el logo, el título, el mes, la fecha de generación y las cuatro secciones en orden (CA-55.2)', async () => {
    const response = await getPdf(`?month=${m1.value}&sections=PROGRAM,POINTS,CONSUMPTIONS,CUSTOMERS`);

    const text = pdfText(response.body as Buffer);
    expect(text).toContain('REPORTE VITTO CLUB');
    expect(text).toContain(`Período: ${monthName(m1.value)} ${m1.year}`);
    expect(text).not.toContain('mes en curso');
    expect(text).toMatch(/Generado: \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
    // Aunque se pidan al revés, salen en el orden del contrato
    const positions = ['CLIENTES', 'CONSUMOS', 'PUNTOS', 'PROGRAMA'].map((title) => text.indexOf(title));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    // El logo es una imagen incrustada
    expect((response.body as Buffer).toString('latin1')).toContain('/Subtype /Image');
  });

  it.each([
    ['CUSTOMERS', 'CLIENTES', ['CONSUMOS', 'PUNTOS', 'PROGRAMA']],
    ['CONSUMPTIONS', 'CONSUMOS', ['CLIENTES', 'PUNTOS', 'PROGRAMA']],
    ['POINTS', 'PUNTOS', ['CLIENTES', 'CONSUMOS', 'PROGRAMA']],
    ['PROGRAM', 'PROGRAMA', ['CLIENTES', 'CONSUMOS', 'PUNTOS']],
  ])('solo la sección pedida (%s)', async (section, title, others) => {
    const response = await getPdf(`?month=${m1.value}&sections=${section}`);

    expect(response.status).toBe(200);
    const text = pdfText(response.body as Buffer);
    expect(text).toContain(title);
    for (const other of others) {
      expect(text).not.toContain(other);
    }
  });

  it('el mes en curso lo dice en el título y trae "En progreso" en las misiones; el cerrado no', async () => {
    const current = pdfText((await getPdf(`?month=${m0.value}&sections=PROGRAM`)).body as Buffer);
    const closed = pdfText((await getPdf(`?month=${m1.value}&sections=PROGRAM`)).body as Buffer);

    expect(current).toContain('(mes en curso)');
    expect(current).toContain('En progreso');
    expect(closed).not.toContain('En progreso');
  });

  it('los mismos datos que la pantalla (los endpoints JSON del mismo mes)', async () => {
    const clients = await getJson('clientes', m1.value);
    const consumptions = await getJson('consumos', m1.value);
    const points = await getJson('puntos', m1.value);
    const program = await getJson('programa', m1.value);

    const text = pdfText((await getPdf(`?month=${m1.value}&sections=CUSTOMERS,CONSUMPTIONS,POINTS,PROGRAM`)).body as Buffer);

    expect(text).toContain(`Clientes activos${clients.active}`);
    expect(text).toContain(`Clientes nuevos${clients.new}`);
    expect(text).toContain(`Frecuentes (al menos ${clients.frequentMinConsumptions} consumos)${clients.frequent}`);
    expect(text).toContain(`Consumos${consumptions.total.count}`);
    // $ 4.650: 3 consumos de $ 1.550
    expect(text).toContain('Monto total$ 4.650');
    const awarded = points.awarded + points.bonus + points.missionRewards + points.birthdayBonus;
    expect(text).toContain(`Total acreditado${awarded.toLocaleString('es-AR')}`);
    expect(text).toContain(`${program.redemptionsUsed} canjes usados`);
    expect(text).toContain('Café + medialuna');
  });

  it('el PDF no se audita ni escribe nada (§3.14.1)', async () => {
    const before = await ctx.prisma.auditLog.count();

    await getPdf(`?month=${m1.value}&sections=POINTS`);

    expect(await ctx.prisma.auditLog.count()).toBe(before);
  });
});
