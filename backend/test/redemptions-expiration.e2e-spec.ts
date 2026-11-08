import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { AuditService } from '../src/audit/application/audit.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { PrismaTransactionRunner } from '../src/prisma/prisma-transaction-runner.js';
import { RedemptionsExpirationService } from '../src/redemptions/application/redemptions-expiration.service.js';
import { REDEMPTION_DURATION_MS } from '../src/redemptions/domain/redemption.js';

// CA-44.7: el barrido no corre solo durante los e2e (ni al iniciar ni cada 5 minutos); los tests
// llaman al proceso directo. Va acá porque test/setup-e2e-env.ts no se tocó en US-44 (el cambio
// está anotado en src/redemptions/documentation-updates-us44.md). ConfigModule no pisa lo ya definido.
process.env.REDEMPTIONS_EXPIRATION_CRON_ENABLED = 'false';

// Cubre US-44 (contrato S4 §3.11 y la auditoría REDEMPTION_EXPIRED de §3.14.2) contra Postgres
// real. El proceso no tiene endpoint: se llama directo a RedemptionsExpirationService, igual que el
// cron, el arranque y el comando. Los endpoints que "vencen al leer" son de US-41/42/43/45: acá se
// prueba vencerVencidos(filtro), que es lo que esos endpoints van a llamar.
// US-40 (confirmar) no está: los canjes se insertan directo en la base, respetando los CHECK de BASE-4.
describe('Vencimiento automático de canjes (e2e, US-44)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let expiration: RedemptionsExpirationService;
  let auditService: AuditService;
  let transactionRunner: PrismaTransactionRunner;
  // La auditoría es solo inserción: se mira desde el último id
  let lastAuditId = 0;

  // "Ahora" de la corrida
  const NOW = new Date('2026-11-07T18:00:00.000Z');
  const ago = (ms: number) => new Date(NOW.getTime() - ms);
  const MINUTE = 60_000;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    expiration = app.get(RedemptionsExpirationService);
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

  const newAuditRows = () =>
    prisma.auditLog.findMany({ where: { id: { gt: lastAuditId } }, orderBy: { id: 'asc' } });

  const statusOf = async (code: string) =>
    (await prisma.redemption.findUniqueOrThrow({ where: { code } })).status;

  // Escenario:
  // - Carolina (saldo 300 en un lote) y una recompensa con stock 5.
  //   · AAAAAA: confirmado hace 20 min → vencido.
  //   · BBBBBB: confirmado hace 15:00 exactos → vencido (CA-44.6).
  //   · CCCCCC: confirmado hace 14:59 → vigente.
  //   · DDDDDD: Utilizado hace 30 min → final, no se toca.
  //   · EEEEEE: Rechazado → final, no se toca.
  // - Martín: FFFFFF, confirmado en caja hace 16 min → vencido.
  async function seedScenario() {
    const carolina = await prisma.customer.create({
      data: { firstName: 'Carolina', lastName: 'Fernández', documentType: 'DNI', documentNumber: '38456001', email: 'carolina@example.com' },
    });
    const martin = await prisma.customer.create({
      data: { firstName: 'Martín', lastName: 'Gómez', documentType: 'PASSPORT', documentNumber: 'AB123456', email: 'martin@example.com' },
    });
    const employee = await prisma.employee.create({
      data: { firstName: 'Bruno', lastName: 'Pérez', email: 'cajero@vitto.club', role: 'CASHIER' },
    });
    const cashier = await prisma.account.create({
      data: { email: 'cajero@vitto.club', passwordHash: 'hashed:x', role: 'CASHIER', employeeId: employee.id },
    });

    await prisma.customerPoints.create({ data: { customerId: carolina.id, balance: 300, debt: 0, lifetimePoints: 500 } });
    await prisma.pointsLot.create({
      data: {
        customerId: carolina.id,
        initialPoints: 300,
        remainingPoints: 300,
        accreditedAt: new Date('2026-06-01T15:00:00.000Z'),
        expiresAt: new Date('2027-06-01T15:00:00.000Z'),
      },
    });

    const reward = await prisma.reward.create({ data: { name: 'Café + medialuna', points: 150, stock: 5 } });

    const confirmed = (code: string, customerId: number, createdAt: Date) => ({
      code,
      customerId,
      rewardId: reward.id,
      rewardName: reward.name,
      points: 150,
      origin: 'APP' as const,
      createdAt,
      expiresAt: new Date(createdAt.getTime() + REDEMPTION_DURATION_MS),
    });

    await prisma.redemption.createMany({
      data: [
        confirmed('AAAAAA', carolina.id, ago(20 * MINUTE)),
        confirmed('BBBBBB', carolina.id, ago(15 * MINUTE)),
        confirmed('CCCCCC', carolina.id, ago(15 * MINUTE - 1000)),
        {
          ...confirmed('DDDDDD', carolina.id, ago(30 * MINUTE)),
          status: 'USED',
          resolvedAt: ago(25 * MINUTE),
          resolvedByAccountId: cashier.id,
          resolvedByName: 'Bruno Pérez',
          balanceBefore: 450,
          balanceAfter: 300,
        },
        {
          ...confirmed('EEEEEE', carolina.id, ago(40 * MINUTE)),
          status: 'REJECTED',
          resolvedAt: ago(35 * MINUTE),
          resolvedByAccountId: cashier.id,
          resolvedByName: 'Bruno Pérez',
          rejectionReason: 'Sin insumo',
        },
        {
          ...confirmed('FFFFFF', martin.id, ago(16 * MINUTE)),
          origin: 'COUNTER',
          confirmedByAccountId: cashier.id,
          confirmedByName: 'Bruno Pérez',
        },
      ],
    });

    return { carolina, martin, reward };
  }

  // Lo que el vencimiento NO puede tocar: saldo, lotes, movimientos y stock (CA-44.4)
  async function untouchedSnapshot(customerId: number, rewardId: number) {
    return {
      points: await prisma.customerPoints.findUnique({ where: { customerId } }),
      lots: await prisma.pointsLot.findMany({ where: { customerId }, orderBy: { id: 'asc' } }),
      movements: await prisma.pointsMovement.count(),
      reward: await prisma.reward.findUniqueOrThrow({ where: { id: rewardId }, select: { stock: true, usedCount: true, status: true } }),
    };
  }

  describe('barrido (CA-44.3, CA-44.4, CA-44.6)', () => {
    it('vence solo los Confirmados con 15 minutos o más; resolvedAt = expiresAt y resuelto por el Sistema', async () => {
      await seedScenario();

      const result = await expiration.run(NOW);

      expect(result).toEqual({ expired: 3, failures: [] });
      expect(await statusOf('AAAAAA')).toBe('EXPIRED');
      expect(await statusOf('BBBBBB')).toBe('EXPIRED');
      expect(await statusOf('FFFFFF')).toBe('EXPIRED');
      expect(await statusOf('CCCCCC')).toBe('CONFIRMED');
      expect(await statusOf('DDDDDD')).toBe('USED');
      expect(await statusOf('EEEEEE')).toBe('REJECTED');

      const a = await prisma.redemption.findUniqueOrThrow({ where: { code: 'AAAAAA' } });
      expect(a).toMatchObject({
        status: 'EXPIRED',
        resolvedAt: a.expiresAt,
        resolvedByAccountId: null,
        resolvedByName: 'Sistema',
        rejectionReason: null,
        balanceBefore: null,
        balanceAfter: null,
      });
      // El que confirmó el Cajero conserva el "Confirmado por"
      expect(await prisma.redemption.findUniqueOrThrow({ where: { code: 'FFFFFF' } })).toMatchObject({
        confirmedByName: 'Bruno Pérez',
        resolvedByName: 'Sistema',
      });
    });

    it('audita REDEMPTION_EXPIRED con actor Sistema, el código y la recompensa, uno por canje', async () => {
      const s = await seedScenario();

      await expiration.run(NOW);

      const rows = await newAuditRows();
      expect(rows).toHaveLength(3);
      expect(rows.map((row) => row.operationCode).sort()).toEqual(['AAAAAA', 'BBBBBB', 'FFFFFF']);
      const a = rows.find((row) => row.operationCode === 'AAAAAA');
      expect(a).toMatchObject({
        actorType: 'SYSTEM',
        actorAccountId: null,
        performedBy: 'Sistema',
        module: 'REDEMPTIONS',
        actionCode: 'REDEMPTION_EXPIRED',
        description: 'Venció el canje de Carolina Fernández',
        affectedCustomerId: s.carolina.id,
        affectedCustomerName: 'Carolina Fernández',
        documentType: 'DNI',
        documentNumber: '38456001',
        details: [
          { label: 'Código del canje', value: 'AAAAAA' },
          { label: 'Recompensa', value: 'Café + medialuna' },
        ],
      });
      expect(rows.find((row) => row.operationCode === 'FFFFFF')).toMatchObject({
        description: 'Venció el canje de Martín Gómez',
        documentType: 'PASSPORT',
        documentNumber: 'AB123456',
      });
    });

    it('no toca saldo, lotes, movimientos ni stock (sin reintegro)', async () => {
      const s = await seedScenario();
      const before = await untouchedSnapshot(s.carolina.id, s.reward.id);

      await expiration.run(NOW);

      expect(await untouchedSnapshot(s.carolina.id, s.reward.id)).toEqual(before);
    });
  });

  describe('idempotencia (CA-44.5)', () => {
    it('correr el barrido dos veces no duplica estados ni auditorías', async () => {
      await seedScenario();

      await expiration.run(NOW);
      const second = await expiration.run(NOW);

      expect(second).toEqual({ expired: 0, failures: [] });
      expect(await newAuditRows()).toHaveLength(3);
    });

    it('dos barridos a la vez no vencen el mismo canje dos veces', async () => {
      await seedScenario();

      const [first, second] = await Promise.all([expiration.run(NOW), expiration.run(NOW)]);

      expect(first.failures).toEqual([]);
      expect(second.failures).toEqual([]);
      expect(first.expired + second.expired).toBe(3);
      expect(await newAuditRows()).toHaveLength(3);
    });

    it('el barrido y un "vencer al leer" a la vez no duplican', async () => {
      await seedScenario();

      const [sweep, read] = await Promise.all([
        expiration.run(NOW),
        expiration.vencerVencidos({ all: true }, NOW),
      ]);

      expect(sweep.failures).toEqual([]);
      expect(sweep.expired + read).toBe(3);
      expect(await newAuditRows()).toHaveLength(3);
    });
  });

  describe('"vencer al leer": vencerVencidos(filtro) (CA-44.1)', () => {
    it('por código: vence solo ese canje', async () => {
      await seedScenario();

      expect(await expiration.vencerVencidos({ code: 'AAAAAA' }, NOW)).toBe(1);

      expect(await statusOf('AAAAAA')).toBe('EXPIRED');
      expect(await statusOf('BBBBBB')).toBe('CONFIRMED');
      expect(await statusOf('FFFFFF')).toBe('CONFIRMED');
      expect(await newAuditRows()).toHaveLength(1);
    });

    it('por código de un canje vigente o final: no hace nada', async () => {
      await seedScenario();

      expect(await expiration.vencerVencidos({ code: 'CCCCCC' }, NOW)).toBe(0);
      expect(await expiration.vencerVencidos({ code: 'DDDDDD' }, NOW)).toBe(0);
      expect(await newAuditRows()).toHaveLength(0);
    });

    it('por cliente: vence solo los de ese cliente', async () => {
      const s = await seedScenario();

      expect(await expiration.vencerVencidos({ customerId: s.carolina.id }, NOW)).toBe(2);

      expect(await statusOf('AAAAAA')).toBe('EXPIRED');
      expect(await statusOf('BBBBBB')).toBe('EXPIRED');
      expect(await statusOf('FFFFFF')).toBe('CONFIRMED');
    });

    it('todos: vence todos los vencidos', async () => {
      await seedScenario();

      expect(await expiration.vencerVencidos({ all: true }, NOW)).toBe(3);
    });
  });

  describe('transacciones (CA-44.2 y rollback)', () => {
    it('CA-44.2: el pase a EXPIRED queda guardado aunque la operación que sigue falle (409)', async () => {
      await seedScenario();

      // Como lo va a usar `usar` (US-42): vencer al leer ANTES de abrir su transacción, que después
      // responde 409 REDEMPTION_EXPIRED y se deshace
      await expect(
        (async () => {
          await expiration.vencerVencidos({ code: 'AAAAAA' }, NOW);
          await transactionRunner.run(async () => {
            throw new Error('409 REDEMPTION_EXPIRED');
          });
        })(),
      ).rejects.toThrow('409 REDEMPTION_EXPIRED');

      expect(await statusOf('AAAAAA')).toBe('EXPIRED');
      expect(await newAuditRows()).toHaveLength(1);
    });

    it('si la auditoría de un canje falla, ese canje queda Confirmado y el barrido sigue con los demás', async () => {
      await seedScenario();
      const record = auditService.record.bind(auditService);
      let calls = 0;
      jest.spyOn(auditService, 'record').mockImplementation(async (entry) => {
        calls += 1;
        if (calls === 1) throw new Error('auditoría caída');
        await record(entry);
      });

      const result = await expiration.run(NOW);

      expect(result.expired).toBe(2);
      expect(result.failures).toHaveLength(1);
      const failedId = result.failures[0].redemptionId;
      expect((await prisma.redemption.findUniqueOrThrow({ where: { id: failedId } })).status).toBe('CONFIRMED');
      expect(await newAuditRows()).toHaveLength(2);

      // Se reintenta en la próxima corrida
      jest.restoreAllMocks();
      expect(await expiration.run(NOW)).toEqual({ expired: 1, failures: [] });
    });
  });
});
