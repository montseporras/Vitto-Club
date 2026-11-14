import request from 'supertest';
import { asAdmin, asCashier, asCustomer, createStatisticsApp, monthAgo, type StatisticsTestApp } from './statistics-helpers.js';

const ENDPOINTS = ['clientes', 'consumos', 'puntos', 'programa'] as const;
const url = (endpoint: string, query: string) => `/api/estadisticas/${endpoint}${query}`;

// Permisos y validación de `month` de US-51 a US-54 y del PDF (CA-51.3, CA-51.5, CA-52.5, CA-53.3, CA-54.6, CA-55.4,
// contrato S5 §3.9 y matriz de §4: `/estadisticas/*` es solo del Administrador).
describe('Estadísticas: permisos y validación del mes (e2e)', () => {
  let ctx: StatisticsTestApp;
  const current = monthAgo(0);
  const lastYear = new Date().getUTCFullYear() - 1;

  beforeAll(async () => {
    ctx = await createStatisticsApp();
    await ctx.resetDatabase();
  });
  afterAll(async () => {
    await ctx.close();
  });

  const get = (path: string, headers: Record<string, string> = {}) => request(ctx.app.getHttpServer()).get(path).set(headers);

  describe.each(ENDPOINTS)('GET /api/estadisticas/%s', (endpoint) => {
    it('Administrador → 200', async () => {
      const response = await get(url(endpoint, `?month=${current.value}`), asAdmin);

      expect(response.status).toBe(200);
    });

    it('Cajero → 403 FORBIDDEN, Cliente → 403 FORBIDDEN, sin token → 401', async () => {
      const cashier = await get(url(endpoint, `?month=${current.value}`), asCashier);
      const customer = await get(url(endpoint, `?month=${current.value}`), asCustomer);
      const anonymous = await get(url(endpoint, `?month=${current.value}`));

      expect(cashier.status).toBe(403);
      expect(cashier.body.code).toBe('FORBIDDEN');
      expect(customer.status).toBe(403);
      expect(customer.body.code).toBe('FORBIDDEN');
      expect(anonymous.status).toBe(401);
    });

    it.each([
      ['falta el mes', '', 'Elegí un mes.'],
      ['mes vacío', '?month=', 'Elegí un mes.'],
      ['formato inválido', '?month=2026-1', 'El mes tiene que tener el formato AAAA-MM.'],
      ['mes 13', '?month=2026-13', 'El mes tiene que tener el formato AAAA-MM.'],
      ['texto', '?month=noviembre', 'El mes tiene que tener el formato AAAA-MM.'],
      ['mes futuro', `?month=${new Date().getUTCFullYear() + 1}-01`, 'No se puede elegir un mes que todavía no empezó.'],
      ['anterior a enero del año pasado', `?month=${lastYear - 1}-12`, `Elegí un mes desde enero de ${lastYear}.`],
    ])('%s → 400 con el mensaje del contrato', async (_name, query, message) => {
      const response = await get(url(endpoint, query), asAdmin);

      expect(response.status).toBe(400);
      expect(response.body.message).toEqual([message]);
      expect(response.body).toMatchObject({ statusCode: 400, error: 'Bad Request', path: url(endpoint, query) });
    });

    it('enero del año pasado es el primer mes que se puede elegir', async () => {
      const response = await get(url(endpoint, `?month=${lastYear}-01`), asAdmin);

      expect(response.status).toBe(200);
    });

    it('no hay groupBy ni otro parámetro (S5-42): se rechaza con 400', async () => {
      const response = await get(url(endpoint, `?month=${current.value}&groupBy=day`), asAdmin);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('property groupBy should not exist');
    });

    it('no escribe en la auditoría (son consultas, §3.14.1)', async () => {
      const before = await ctx.prisma.auditLog.count();

      await get(url(endpoint, `?month=${current.value}`), asAdmin);

      expect(await ctx.prisma.auditLog.count()).toBe(before);
    });
  });

  describe('GET /api/estadisticas/reporte.pdf', () => {
    const pdf = (query: string, headers: Record<string, string> = {}) => get(`/api/estadisticas/reporte.pdf${query}`, headers);

    it('Cajero → 403, Cliente → 403, sin token → 401', async () => {
      const query = `?month=${current.value}&sections=POINTS`;

      expect((await pdf(query, asCashier)).status).toBe(403);
      expect((await pdf(query, asCustomer)).status).toBe(403);
      expect((await pdf(query)).status).toBe(401);
    });

    it.each([
      ['sin secciones', `?month=${current.value}`, 'Elegí al menos una sección.'],
      ['secciones vacías', `?month=${current.value}&sections=`, 'Elegí al menos una sección.'],
      ['una sección que no existe', `?month=${current.value}&sections=FOO`, 'Elegí secciones válidas: Clientes, Consumos, Puntos o Programa.'],
      ['una sección válida y otra que no', `?month=${current.value}&sections=POINTS,FOO`, 'Elegí secciones válidas: Clientes, Consumos, Puntos o Programa.'],
      ['una sección repetida', `?month=${current.value}&sections=POINTS,POINTS`, 'Elegí secciones válidas: Clientes, Consumos, Puntos o Programa.'],
    ])('%s → 400', async (_name, query, message) => {
      const response = await pdf(query, asAdmin);

      expect(response.status).toBe(400);
      expect(response.body.message).toEqual([message]);
    });

    it.each([
      ['falta el mes', '?sections=POINTS', 'Elegí un mes.'],
      ['formato inválido', '?month=2026-1&sections=POINTS', 'El mes tiene que tener el formato AAAA-MM.'],
      ['mes futuro', `?month=${new Date().getUTCFullYear() + 1}-01&sections=POINTS`, 'No se puede elegir un mes que todavía no empezó.'],
      ['anterior a enero del año pasado', `?month=${lastYear - 1}-12&sections=POINTS`, `Elegí un mes desde enero de ${lastYear}.`],
    ])('mismas validaciones de mes que las estadísticas: %s → 400', async (_name, query, message) => {
      const response = await pdf(query, asAdmin);

      expect(response.status).toBe(400);
      expect(response.body.message).toEqual([message]);
    });

    it('sin el mes ni las secciones, los dos mensajes', async () => {
      const response = await pdf('', asAdmin);

      expect(response.status).toBe(400);
      expect(response.body.message).toEqual(expect.arrayContaining(['Elegí un mes.', 'Elegí al menos una sección.']));
    });
  });
});
