import request from 'supertest';
import { AuditService } from '../src/audit/application/audit.service.js';
import { asAdmin, asCashier, asCustomer, createStatisticsApp, type StatisticsTestApp } from './statistics-helpers.js';

const URL = '/api/loyalty/configuration/frequent-customers';
const LEVELS_URL = '/api/loyalty/configuration/levels';
const MESSAGE = 'Ingresá un número entero de 1 a 100.';

// US-51 (CA-51.2 [B], contrato S5 §3.9.6): mínimo de consumos de un cliente frecuente, en una versión nueva de la
// configuración del programa y auditado con FREQUENT_CUSTOMERS_UPDATED.
describe('Mínimo de cliente frecuente (e2e, US-51)', () => {
  let ctx: StatisticsTestApp;
  let lastAuditId = 0;

  beforeAll(async () => {
    ctx = await createStatisticsApp();
  });
  afterAll(async () => {
    jest.restoreAllMocks();
    await ctx.close();
  });
  beforeEach(async () => {
    jest.restoreAllMocks();
    await ctx.resetDatabase();
    lastAuditId = (await ctx.prisma.auditLog.findFirst({ orderBy: { id: 'desc' } }))?.id ?? 0;
  });

  const newAuditRows = () => ctx.prisma.auditLog.findMany({ where: { id: { gt: lastAuditId } }, orderBy: { id: 'asc' } });
  const http = () => request(ctx.app.getHttpServer());

  it('GET: por defecto 3', async () => {
    const response = await http().get(URL).set(asAdmin);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ minConsumptions: 3 });
  });

  it('PUT: guarda en una versión nueva, copia el resto de la configuración y audita FREQUENT_CUSTOMERS_UPDATED', async () => {
    const response = await http().put(URL).set(asAdmin).send({ minConsumptions: 5 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ minConsumptions: 5 });
    expect((await http().get(URL).set(asAdmin)).body).toEqual({ minConsumptions: 5 });

    const versions = await ctx.prisma.loyaltyProgramConfiguration.findMany({ orderBy: { version: 'asc' } });
    expect(versions).toHaveLength(2);
    expect(versions[0]).toMatchObject({ version: 1, isActive: false, frequentMinConsumptions: 3 });
    expect(versions[0].validTo).not.toBeNull();
    expect(versions[1]).toMatchObject({ version: 2, isActive: true, frequentMinConsumptions: 5, pointsAwarded: 10, pointsExpirationMonths: 12, silverMinPoints: 300, goldMinPoints: 800 });
    expect(versions[1].baseAmount?.toNumber()).toBe(1000);

    const rows = await newAuditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      module: 'CONFIGURATION',
      actionCode: 'FREQUENT_CUSTOMERS_UPDATED',
      description: 'Modificó el mínimo de cliente frecuente',
      actorType: 'EMPLOYEE',
      actorAccountId: ctx.actor.accountId,
      performedBy: 'Ana Gómez',
    });
    expect(rows[0].details).toEqual([{ label: 'Mínimo de consumos', value: '3 → 5' }]);
  });

  it('guardar otra configuración después no vuelve el mínimo a 3', async () => {
    await http().put(URL).set(asAdmin).send({ minConsumptions: 7 }).expect(200);

    await http().put(LEVELS_URL).set(asAdmin).send({ silverMinPoints: 400, goldMinPoints: 900 }).expect(200);

    expect((await http().get(URL).set(asAdmin)).body).toEqual({ minConsumptions: 7 });
    const active = await ctx.prisma.loyaltyProgramConfiguration.findFirstOrThrow({ where: { isActive: true } });
    expect(active).toMatchObject({ silverMinPoints: 400, frequentMinConsumptions: 7 });
  });

  it('los extremos 1 y 100 son válidos', async () => {
    expect((await http().put(URL).set(asAdmin).send({ minConsumptions: 1 })).body).toEqual({ minConsumptions: 1 });
    expect((await http().put(URL).set(asAdmin).send({ minConsumptions: 100 })).body).toEqual({ minConsumptions: 100 });
  });

  it('el mismo valor igual crea la versión y audita "Se guardó sin modificar valores"', async () => {
    await http().put(URL).set(asAdmin).send({ minConsumptions: 3 }).expect(200);

    const rows = await newAuditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].details).toEqual([{ label: 'Cambios', value: 'Se guardó sin modificar valores' }]);
  });

  it.each([
    [{}, 'falta'],
    [{ minConsumptions: null }, 'null'],
    [{ minConsumptions: 0 }, '0'],
    [{ minConsumptions: 101 }, '101'],
    [{ minConsumptions: -3 }, 'negativo'],
    [{ minConsumptions: 2.5 }, 'decimal'],
    [{ minConsumptions: 'tres' }, 'texto'],
    [{ minConsumptions: '3' }, 'texto numérico'],
  ])('%j (%s) → 400 con el mensaje del contrato, sin versión nueva ni auditoría', async (body) => {
    const response = await http().put(URL).set(asAdmin).send(body);

    expect(response.status).toBe(400);
    expect(response.body.message).toEqual([MESSAGE]);
    expect(await ctx.prisma.loyaltyProgramConfiguration.count()).toBe(1);
    expect(await newAuditRows()).toHaveLength(0);
  });

  it('un campo desconocido en el body → 400', async () => {
    const response = await http().put(URL).set(asAdmin).send({ minConsumptions: 4, otro: 1 });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('property otro should not exist');
  });

  it('si la auditoría falla, no queda la versión nueva (misma transacción)', async () => {
    jest.spyOn(app(), 'record').mockRejectedValueOnce(new Error('falla la auditoría'));

    const response = await http().put(URL).set(asAdmin).send({ minConsumptions: 5 });

    expect(response.status).toBe(500);
    expect(await ctx.prisma.loyaltyProgramConfiguration.count()).toBe(1);
    expect((await http().get(URL).set(asAdmin)).body).toEqual({ minConsumptions: 3 });
    expect(await newAuditRows()).toHaveLength(0);
  });

  it('solo el Administrador: Cajero y Cliente → 403, sin token → 401 (GET y PUT)', async () => {
    for (const headers of [asCashier, asCustomer]) {
      expect((await http().get(URL).set(headers)).status).toBe(403);
      expect((await http().put(URL).set(headers).send({ minConsumptions: 5 })).status).toBe(403);
    }
    expect((await http().get(URL)).status).toBe(401);
    expect((await http().put(URL).send({ minConsumptions: 5 })).status).toBe(401);
    expect(await ctx.prisma.loyaltyProgramConfiguration.count()).toBe(1);
  });

  // El servicio de auditoría de la app de prueba
  function app() {
    return ctx.app.get(AuditService);
  }
});
