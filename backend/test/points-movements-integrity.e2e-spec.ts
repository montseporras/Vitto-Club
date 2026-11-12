import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { deletePointsMovements } from './delete-points-movements.js';

// ARRASTRE-S4 (A4-05; A-02 y A-03 del cierre del Sprint 3, contrato S3 §3.12): points_movements es
// solo inserción (mismo trigger que audit_logs) y tiene los CHECK `points <> 0` y "reason obligatorio
// en MANUAL_ADJUSTMENT". Los trigger y los CHECK están escritos a mano en la migración: este test
// confirma que existen y que la base rechaza lo que corresponde.
describe('Integridad de points_movements (e2e, A4-05)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let customerId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase();
    const customer = await prisma.customer.create({
      data: {
        firstName: 'Carolina',
        lastName: 'Fernández',
        documentType: 'DNI',
        documentNumber: '38456123',
        email: 'carolina@vitto.club',
      },
    });
    customerId = customer.id;
  });

  async function cleanDatabase() {
    await deletePointsMovements(prisma);
    await prisma.pointsLot.deleteMany();
    await prisma.customerPoints.deleteMany();
    await prisma.redemption.deleteMany();
    await prisma.reward.deleteMany();
    await prisma.consumption.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.customer.deleteMany();
  }

  // Un movimiento válido; cada test pisa lo que quiere probar
  const insertMovement = (overrides: Record<string, unknown> = {}) =>
    prisma.pointsMovement.create({
      data: {
        customerId,
        type: 'MANUAL_ADJUSTMENT',
        points: 10,
        balanceAfter: 10,
        reason: 'Ajuste de prueba',
        performedByName: 'Sistema',
        ...overrides,
      },
    });

  it('los CHECK y los triggers existen en la base', async () => {
    const checks = await prisma.$queryRaw<{ conname: string }[]>`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'points_movements'::regclass AND contype = 'c'
    `;
    expect(checks.map((row) => row.conname)).toEqual(
      expect.arrayContaining([
        'points_movements_points_check',
        'points_movements_manual_adjustment_reason_check',
        'points_movements_redemption_check', // BASE-4: sigue estando
      ]),
    );

    const triggers = await prisma.$queryRaw<{ tgname: string; enabled: string }[]>`
      SELECT tgname, tgenabled::text AS enabled FROM pg_trigger
      WHERE tgrelid = 'points_movements'::regclass AND NOT tgisinternal
    `;
    const byName = new Map(triggers.map((row) => [row.tgname, row.enabled]));
    // 'O' = prendido
    expect(byName.get('points_movements_immutable')).toBe('O');
    expect(byName.get('points_movements_no_truncate')).toBe('O');
  });

  it('rechaza un movimiento con points = 0', async () => {
    await expect(insertMovement({ points: 0 })).rejects.toThrow(/points_movements_points_check/);
    expect(await prisma.pointsMovement.count()).toBe(0);
  });

  it('rechaza un MANUAL_ADJUSTMENT sin motivo', async () => {
    await expect(insertMovement({ reason: null })).rejects.toThrow(/points_movements_manual_adjustment_reason_check/);
    expect(await prisma.pointsMovement.count()).toBe(0);
  });

  it('acepta un MANUAL_ADJUSTMENT con motivo y un movimiento de otro tipo sin motivo', async () => {
    await insertMovement();
    await insertMovement({ type: 'EXPIRATION', points: -5, balanceAfter: 5, reason: null });

    expect(await prisma.pointsMovement.count()).toBe(2);
  });

  it('la base rechaza UPDATE, DELETE y TRUNCATE sobre points_movements', async () => {
    const row = await insertMovement();

    await expect(prisma.$executeRaw`UPDATE points_movements SET points = 99 WHERE id = ${row.id}`).rejects.toThrow(
      /append-only/,
    );
    await expect(prisma.$executeRaw`DELETE FROM points_movements WHERE id = ${row.id}`).rejects.toThrow(/append-only/);
    await expect(prisma.$executeRawUnsafe('TRUNCATE TABLE points_movements')).rejects.toThrow(/append-only/);

    const intact = await prisma.pointsMovement.findUnique({ where: { id: row.id } });
    expect(intact?.points).toBe(10);
  });

  it('el helper de los tests vacía la tabla y deja el trigger prendido', async () => {
    await insertMovement();

    await deletePointsMovements(prisma);
    expect(await prisma.pointsMovement.count()).toBe(0);

    const row = await insertMovement();
    await expect(prisma.$executeRaw`DELETE FROM points_movements WHERE id = ${row.id}`).rejects.toThrow(/append-only/);
  });
});
