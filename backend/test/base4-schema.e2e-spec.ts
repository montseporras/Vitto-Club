import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { deletePointsMovements } from './delete-points-movements.js';

// BASE-4 (CA-B4.1, CA-B4.2 y CA-B4.3, contrato S4 §3.15). Los CHECK y el índice parcial del nombre
// están escritos a mano en la migración: este test confirma que existen en la base y que
// rechazan los INSERT/UPDATE directos que violan una regla.
describe('Modelo de recompensas y canjes (e2e, BASE-4)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let customerId: number;
  let cashierAccountId: number;

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
    const employee = await prisma.employee.create({
      data: { firstName: 'Bruno', lastName: 'Pérez', email: 'cajero@vitto.club', role: 'CASHIER' },
    });
    const account = await prisma.account.create({
      data: { email: 'cajero@vitto.club', passwordHash: 'hashed:x', role: 'CASHIER', employeeId: employee.id },
    });
    cashierAccountId = account.id;
  });

  // Las demás suites borran clientes y cuentas sin saber de canjes (onDelete Restrict)
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

  // --- Helpers: SQL directo, sin pasar por la aplicación ---

  async function insertReward(values: Partial<Record<string, string>> = {}): Promise<number> {
    const row = {
      name: `'Medialunas x3'`,
      points: '100',
      stock: '30',
      status: `'ACTIVE'`,
      disabled_reason: 'NULL',
      used_count: '0',
      deleted_at: 'NULL',
      ...values,
    };
    const result = await prisma.$queryRawUnsafe<{ id: number }[]>(
      `INSERT INTO rewards (name, points, stock, status, disabled_reason, used_count, deleted_at, updated_at)
       VALUES (${row.name}, ${row.points}, ${row.stock}, ${row.status}::"RewardStatus",
               ${row.disabled_reason}::"RewardDisabledReason", ${row.used_count}, ${row.deleted_at}, now())
       RETURNING id`,
    );
    return result[0].id;
  }

  async function insertRedemption(
    rewardId: number,
    values: Partial<Record<string, string>> = {},
  ): Promise<number> {
    const row = {
      code: `'K7MP2X'`,
      points: '100',
      status: `'CONFIRMED'`,
      origin: `'APP'`,
      confirmed_by_account_id: 'NULL',
      created_at: `'2026-11-07 15:00:00'`,
      expires_at: `'2026-11-07 15:15:00'`,
      resolved_at: 'NULL',
      rejection_reason: 'NULL',
      balance_before: 'NULL',
      balance_after: 'NULL',
      ...values,
    };
    const result = await prisma.$queryRawUnsafe<{ id: number }[]>(
      `INSERT INTO redemptions (code, customer_id, reward_id, reward_name, points, status, origin,
         confirmed_by_account_id, created_at, expires_at, resolved_at, rejection_reason,
         balance_before, balance_after)
       VALUES (${row.code}, ${customerId}, ${rewardId}, 'Medialunas x3', ${row.points},
               ${row.status}::"RedemptionStatus", ${row.origin}::"RedemptionOrigin",
               ${row.confirmed_by_account_id}, ${row.created_at}, ${row.expires_at}, ${row.resolved_at},
               ${row.rejection_reason}, ${row.balance_before}, ${row.balance_after})
       RETURNING id`,
    );
    return result[0].id;
  }

  // Lleva un motivo siempre: desde ARRASTRE-S4 (A4-05) un MANUAL_ADJUSTMENT sin motivo lo rechaza
  // su propio CHECK, y estos tests tienen que fallar solo por points_movements_redemption_check.
  async function insertMovement(type: string, redemptionId: number | null) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO points_movements (customer_id, type, points, balance_after, redemption_id, reason, performed_by_name)
       VALUES (${customerId}, '${type}'::"PointsMovementType", -100, 0, ${redemptionId ?? 'NULL'}, 'Movimiento de prueba', 'Bruno Pérez')`,
    );
  }

  describe('CA-B4.1: la migración creó los CHECK y los índices', () => {
    it('CHECK de rewards, redemptions y points_movements', async () => {
      const rows = await prisma.$queryRaw<{ conname: string }[]>`
        SELECT conname FROM pg_constraint
        WHERE contype = 'c'
          AND conrelid IN ('rewards'::regclass, 'redemptions'::regclass, 'points_movements'::regclass)
      `;
      expect(rows.map((r) => r.conname)).toEqual(
        expect.arrayContaining([
          'rewards_points_range_check',
          'rewards_stock_range_check',
          'rewards_used_count_check',
          'rewards_disabled_reason_check',
          'rewards_deleted_at_check',
          'redemptions_code_format_check',
          'redemptions_points_check',
          'redemptions_confirmed_by_check',
          'redemptions_expires_at_check',
          'redemptions_resolved_at_check',
          'redemptions_rejection_reason_check',
          'redemptions_balance_before_check',
          'redemptions_balance_after_check',
          'points_movements_redemption_check',
        ]),
      );
    });

    it('índice único parcial del nombre y los índices de §3.15', async () => {
      const rows = await prisma.$queryRaw<{ indexname: string; indexdef: string }[]>`
        SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('rewards', 'redemptions')
      `;
      const byName = new Map(rows.map((r) => [r.indexname, r.indexdef]));

      const nameIndex = byName.get('rewards_active_name_key') ?? '';
      expect(nameIndex).toMatch(/CREATE UNIQUE INDEX/);
      expect(nameIndex).toMatch(/lower\(TRIM\(BOTH FROM name\)\)|lower\(btrim\(\(name\)::text\)\)/i);
      expect(nameIndex).toMatch(/WHERE \(status <> 'DELETED'::"RewardStatus"\)/);

      expect([...byName.keys()]).toEqual(
        expect.arrayContaining([
          'rewards_status_expires_at_idx',
          'rewards_updated_at_idx',
          'redemptions_code_key',
          'redemptions_customer_id_created_at_idx',
          'redemptions_status_expires_at_idx',
          'redemptions_reward_id_status_idx',
          'redemptions_created_at_idx',
        ]),
      );
    });
  });

  describe('CA-B4.2: la base rechaza lo que viola una regla', () => {
    it('una recompensa y un canje válidos se aceptan (control)', async () => {
      const rewardId = await insertReward();
      await expect(insertRedemption(rewardId)).resolves.toEqual(expect.any(Number));
    });

    it.each([
      ['points = 0', { points: '0' }, 'rewards_points_range_check'],
      ['points > 1.000.000', { points: '1000001' }, 'rewards_points_range_check'],
      ['stock = -1', { stock: '-1' }, 'rewards_stock_range_check'],
      ['stock > 100.000', { stock: '100001' }, 'rewards_stock_range_check'],
      ['used_count negativo', { used_count: '-1' }, 'rewards_used_count_check'],
      ['DISABLED sin motivo', { status: `'DISABLED'` }, 'rewards_disabled_reason_check'],
      ['ACTIVE con motivo', { disabled_reason: `'OUT_OF_STOCK'` }, 'rewards_disabled_reason_check'],
      ['DELETED sin deleted_at', { status: `'DELETED'` }, 'rewards_deleted_at_check'],
      ['ACTIVE con deleted_at', { deleted_at: 'now()' }, 'rewards_deleted_at_check'],
    ])('recompensa con %s', async (_case, values, constraint) => {
      await expect(insertReward(values)).rejects.toThrow(constraint);
    });

    it('stock null (sin límite) se acepta', async () => {
      await expect(insertReward({ stock: 'NULL' })).resolves.toEqual(expect.any(Number));
    });

    it('UPDATE directo: ACTIVE → DISABLED sin motivo se rechaza', async () => {
      const id = await insertReward();
      await expect(
        prisma.$executeRawUnsafe(`UPDATE rewards SET status = 'DISABLED' WHERE id = ${id}`),
      ).rejects.toThrow('rewards_disabled_reason_check');
    });

    it('dos recompensas no dadas de baja con el mismo nombre (sin distinguir mayúsculas ni espacios)', async () => {
      await insertReward({ name: `'Brunch'` });
      await expect(insertReward({ name: `'  bRUNCH '` })).rejects.toThrow('rewards_active_name_key');
    });

    it.each([
      ['con 0', `'K7MP20'`],
      ['con O', `'K7MPOX'`],
      ['con 1', `'K7MP1X'`],
      ['con I', `'K7MPIX'`],
      ['de 5 caracteres', `'K7MP2'`],
      ['en minúsculas', `'k7mp2x'`],
    ])('código de canje %s', async (_case, code) => {
      const rewardId = await insertReward();
      await expect(insertRedemption(rewardId, { code })).rejects.toThrow('redemptions_code_format_check');
    });

    it('código de 7 caracteres: no entra en CHAR(6)', async () => {
      const rewardId = await insertReward();
      await expect(insertRedemption(rewardId, { code: `'K7MP2XY'` })).rejects.toThrow();
    });

    it('código repetido', async () => {
      const rewardId = await insertReward();
      await insertRedemption(rewardId);
      await expect(insertRedemption(rewardId)).rejects.toThrow('redemptions_code_key');
    });

    it.each([
      ['REJECTED sin motivo', { status: `'REJECTED'`, resolved_at: 'now()' }, 'redemptions_rejection_reason_check'],
      ['CONFIRMED con motivo de rechazo', { rejection_reason: `'Sin insumo'` }, 'redemptions_rejection_reason_check'],
      ['CONFIRMED con resolved_at', { resolved_at: 'now()' }, 'redemptions_resolved_at_check'],
      ['CANCELLED sin resolved_at', { status: `'CANCELLED'` }, 'redemptions_resolved_at_check'],
      ['points = 0', { points: '0' }, 'redemptions_points_check'],
      ['vence a los 30 minutos', { expires_at: `'2026-11-07 15:30:00'` }, 'redemptions_expires_at_check'],
      ['COUNTER sin empleado', { origin: `'COUNTER'` }, 'redemptions_confirmed_by_check'],
      // Faltan (o sobran) los dos saldos: Postgres evalúa los CHECK por orden alfabético y
      // salta primero el de balance_after; cualquiera de los dos alcanza
      [
        'USED sin saldos',
        { status: `'USED'`, resolved_at: 'now()' },
        /redemptions_balance_(before|after)_check/,
      ],
      [
        'CONFIRMED con saldos',
        { balance_before: '300', balance_after: '200' },
        /redemptions_balance_(before|after)_check/,
      ],
      [
        'USED con solo balance_after',
        { status: `'USED'`, resolved_at: 'now()', balance_after: '200' },
        'redemptions_balance_before_check',
      ],
      [
        'USED con solo balance_before',
        { status: `'USED'`, resolved_at: 'now()', balance_before: '300' },
        'redemptions_balance_after_check',
      ],
    ])('canje %s', async (_case, values, constraint) => {
      const rewardId = await insertReward();
      await expect(insertRedemption(rewardId, values)).rejects.toThrow(constraint);
    });

    it('APP con empleado que lo confirmó', async () => {
      const rewardId = await insertReward();
      await expect(
        insertRedemption(rewardId, { confirmed_by_account_id: String(cashierAccountId) }),
      ).rejects.toThrow('redemptions_confirmed_by_check');
    });

    it('casos válidos de cada estado final se aceptan (control)', async () => {
      const rewardId = await insertReward();
      await insertRedemption(rewardId, {
        code: `'AAAAA2'`,
        status: `'USED'`,
        origin: `'COUNTER'`,
        confirmed_by_account_id: String(cashierAccountId),
        resolved_at: 'now()',
        balance_before: '300',
        balance_after: '200',
      });
      await insertRedemption(rewardId, {
        code: `'AAAAA3'`,
        status: `'REJECTED'`,
        resolved_at: 'now()',
        rejection_reason: `'Sin insumo'`,
      });
      await insertRedemption(rewardId, { code: `'AAAAA4'`, status: `'CANCELLED'`, resolved_at: 'now()' });
      await insertRedemption(rewardId, { code: `'AAAAA5'`, status: `'EXPIRED'`, resolved_at: 'now()' });
      expect(await prisma.redemption.count()).toBe(4);
    });

    it('UPDATE directo: CONFIRMED → REJECTED sin motivo se rechaza', async () => {
      const id = await insertRedemption(await insertReward());
      await expect(
        prisma.$executeRawUnsafe(
          `UPDATE redemptions SET status = 'REJECTED', resolved_at = now() WHERE id = ${id}`,
        ),
      ).rejects.toThrow('redemptions_rejection_reason_check');
    });

    it('movimiento REDEMPTION sin redemption_id', async () => {
      await expect(insertMovement('REDEMPTION', null)).rejects.toThrow('points_movements_redemption_check');
    });

    it('movimiento de otro tipo con redemption_id', async () => {
      const redemptionId = await insertRedemption(await insertReward());
      await expect(insertMovement('MANUAL_ADJUSTMENT', redemptionId)).rejects.toThrow(
        'points_movements_redemption_check',
      );
    });

    it('movimiento REDEMPTION con su canje se acepta (control)', async () => {
      const redemptionId = await insertRedemption(await insertReward());
      await expect(insertMovement('REDEMPTION', redemptionId)).resolves.toBeUndefined();
    });
  });

  describe('CA-B4.3: nombre libre después de eliminar', () => {
    it('con "Brunch" DELETED, se acepta otra "brunch" ACTIVE', async () => {
      await insertReward({ name: `'Brunch'`, status: `'DELETED'`, deleted_at: 'now()' });
      await expect(insertReward({ name: `'brunch'` })).resolves.toEqual(expect.any(Number));
    });

    it('INACTIVE y DISABLED siguen ocupando el nombre', async () => {
      await insertReward({ name: `'Brunch'`, status: `'INACTIVE'` });
      await expect(insertReward({ name: `'BRUNCH'` })).rejects.toThrow('rewards_active_name_key');
    });
  });
});
