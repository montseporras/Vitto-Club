import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { deleteNotifications } from './delete-notifications.js';
import { deletePointsMovements } from './delete-points-movements.js';

// BASE-5 (CA-B5.1 a CA-B5.4, contrato S5 §3.15). Los CHECK, el índice parcial del nombre de la misión y el
// trigger de notifications están escritos a mano en la migración sprint5_base5_missions_notifications:
// este test confirma que existen, que la base rechaza lo que corresponde (con INSERT y UPDATE directos,
// sin pasar por la aplicación) y que los valores por defecto quedaron cargados.
describe('Modelo de misiones, notificaciones y promociones (e2e, BASE-5)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let customerId: number;
  let employeeId: number;

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
    customerId = (
      await prisma.customer.create({
        data: {
          firstName: 'Carolina',
          lastName: 'Fernández',
          documentType: 'DNI',
          documentNumber: '38456123',
          email: 'carolina@vitto.club',
        },
      })
    ).id;
    employeeId = (
      await prisma.employee.create({
        data: { firstName: 'Bruno', lastName: 'Pérez', email: 'admin@vitto.club', role: 'ADMIN' },
      })
    ).id;
  });

  // Orden que respeta las FK. notifications y points_movements son solo inserción: se vacían con los helpers
  async function cleanDatabase() {
    await deleteNotifications(prisma);
    await prisma.promotionSend.deleteMany();
    await deletePointsMovements(prisma);
    await prisma.customerMission.deleteMany();
    await prisma.mission.deleteMany();
    await prisma.pointsLot.deleteMany();
    await prisma.customerPoints.deleteMany();
    await prisma.redemption.deleteMany();
    await prisma.reward.deleteMany();
    await prisma.consumption.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.loyaltyProgramConfiguration.deleteMany();
  }

  // --- Helpers: SQL directo, sin pasar por la aplicación ---

  type Values = Record<string, string>;

  async function insert(table: string, defaults: Values, overrides: Values = {}): Promise<number> {
    const row = { ...defaults, ...overrides };
    const result = await prisma.$queryRawUnsafe<{ id: number }[]>(
      `INSERT INTO ${table} (${Object.keys(row).join(', ')}) VALUES (${Object.values(row).join(', ')}) RETURNING id`,
    );
    return result[0].id;
  }

  // Cada default es una fila válida: los tests pisan solo lo que quieren romper
  const missionDefaults = (): Values => ({
    name: `'Brunch del finde'`,
    objective_type: `'CONSUMPTION_COUNT'`,
    target: '3',
    days_of_week: 'NULL',
    time_from: 'NULL',
    time_to: 'NULL',
    reward_points: '100',
    start_month: `'2026-11-01'`,
    end_month: 'NULL',
    status: `'ACTIVE'`,
    deleted_at: 'NULL',
    updated_at: 'now()',
  });
  const insertMission = (overrides: Values = {}) => insert('missions', missionDefaults(), overrides);

  const customerMissionDefaults = (missionId: number): Values => ({
    mission_id: String(missionId),
    customer_id: String(customerId),
    period: `'2026-11-01'`,
    objective_type: `'CONSUMPTION_COUNT'`,
    target: '3',
    days_of_week: 'NULL',
    time_from: 'NULL',
    time_to: 'NULL',
    reward_points: '100',
    progress: '0',
    status: `'IN_PROGRESS'`,
    completed_at: 'NULL',
    claimed_at: 'NULL',
    expired_at: 'NULL',
    claimed_by: 'NULL',
    expiration_reason: 'NULL',
  });
  async function insertCustomerMission(overrides: Values = {}, missionId?: number) {
    return await insert('customer_missions', customerMissionDefaults(missionId ?? (await insertMission())), overrides);
  }

  const movementDefaults = (): Values => ({
    customer_id: String(customerId),
    type: `'MISSION_REWARD'`,
    points: '100',
    balance_after: '100',
    customer_mission_id: 'NULL',
    reason: 'NULL',
    performed_by_name: `'Sistema'`,
  });
  const insertMovement = (overrides: Values = {}) => insert('points_movements', movementDefaults(), overrides);

  const promotionSendDefaults = (): Values => ({
    subject: `'¡Este viernes, pizza libre!'`,
    body: `'Hola {nombre}: todos los viernes, pizza libre.'`,
    level: 'NULL',
    scheduled_at: 'NULL',
    status: `'SENT'`,
    sent_at: 'now()',
    cancelled_at: 'NULL',
    recipients: '0',
    created_by_employee_id: String(employeeId),
  });
  const insertPromotionSend = (overrides: Values = {}) => insert('promotion_sends', promotionSendDefaults(), overrides);

  const notificationDefaults = (): Values => ({
    type: `'POINTS_EXPIRING'`,
    channel: `'EMAIL'`,
    recipient: `'carolina@vitto.club'`,
    customer_id: String(customerId),
    subject: `'Tus puntos están por vencer'`,
    body: `'Hola Carolina'`,
    status: `'SENT'`,
    error: 'NULL',
    dedupe_key: `'lot:1'`,
    promotion_send_id: 'NULL',
    resent_from_id: 'NULL',
  });
  const insertNotification = (overrides: Values = {}) => insert('notifications', notificationDefaults(), overrides);

  const createConfiguration = () =>
    prisma.loyaltyProgramConfiguration.create({ data: { version: 1, baseAmount: 1000, pointsAwarded: 10, isActive: true } });

  // --- CA-B5.1 ---

  describe('CA-B5.1: la migración creó las tablas, los CHECK, los índices y los triggers', () => {
    it('las seis tablas nuevas existen', async () => {
      const rows = await prisma.$queryRaw<{ table_name: string }[]>`
        SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
      `;
      expect(rows.map((row) => row.table_name)).toEqual(
        expect.arrayContaining([
          'missions',
          'customer_missions',
          'notification_templates',
          'notification_settings',
          'notifications',
          'promotion_sends',
        ]),
      );
    });

    it('los CHECK de §3.15 existen (consulta pg_constraint)', async () => {
      const rows = await prisma.$queryRaw<{ conname: string }[]>`SELECT conname FROM pg_constraint WHERE contype = 'c'`;
      expect(rows.map((row) => row.conname)).toEqual(
        expect.arrayContaining([
          'missions_target_check',
          'missions_target_whole_count_check',
          'missions_days_of_week_check',
          'missions_time_range_check',
          'missions_reward_points_check',
          'missions_end_month_check',
          'missions_deleted_at_check',
          'customer_missions_progress_check',
          'customer_missions_completed_at_check',
          'customer_missions_claimed_at_check',
          'customer_missions_claimed_by_check',
          'customer_missions_expired_at_check',
          'customer_missions_expiration_reason_check',
          'points_movements_mission_check',
          'loyalty_program_configurations_frequent_min_check',
          'notification_templates_type_check',
          'notification_settings_singleton_check',
          'notification_settings_birthday_bonus_points_check',
          'notifications_error_check',
          'notifications_promotion_send_check',
          'promotion_sends_level_check',
          'promotion_sends_scheduled_check',
          'promotion_sends_sent_check',
          'promotion_sends_cancelled_check',
        ]),
      );
    });

    it('los índices existen, incluido el único parcial del nombre de la misión (consulta pg_indexes)', async () => {
      const rows = await prisma.$queryRaw<{ indexname: string; indexdef: string }[]>`
        SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public'
      `;
      const names = rows.map((row) => row.indexname);
      expect(names).toEqual(
        expect.arrayContaining([
          'missions_active_name_key',
          'customer_missions_mission_id_customer_id_period_key',
          'customer_missions_status_period_idx',
          'customer_missions_customer_id_period_idx',
          'notifications_type_customer_id_dedupe_key_key',
          'notifications_resent_from_id_key',
          'promotion_sends_status_scheduled_at_idx',
          'points_movements_customer_mission_id_key',
        ]),
      );
      const nameIndex = rows.find((row) => row.indexname === 'missions_active_name_key');
      expect(nameIndex?.indexdef).toMatch(/UNIQUE/);
      expect(nameIndex?.indexdef).toMatch(/lower\(TRIM\(BOTH FROM name\)\)/i);
      expect(nameIndex?.indexdef).toMatch(/WHERE .*status.*DELETED/);
    });

    it('notifications tiene los dos triggers de solo inserción, prendidos', async () => {
      const rows = await prisma.$queryRaw<{ tgname: string; enabled: string }[]>`
        SELECT tgname, tgenabled::text AS enabled FROM pg_trigger
        WHERE tgrelid = 'notifications'::regclass AND NOT tgisinternal
      `;
      const byName = new Map(rows.map((row) => [row.tgname, row.enabled]));
      expect(byName.get('notifications_immutable')).toBe('O');
      expect(byName.get('notifications_no_truncate')).toBe('O');
    });

    it('los enums tienen los valores nuevos', async () => {
      const values = async (type: string) =>
        (
          await prisma.$queryRawUnsafe<{ label: string }[]>(
            `SELECT e.enumlabel AS label FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = '${type}'`,
          )
        ).map((row) => row.label);

      expect(await values('PointsMovementType')).toEqual(expect.arrayContaining(['MISSION_REWARD', 'BIRTHDAY_BONUS']));
      expect(await values('AuditAction')).toEqual(
        expect.arrayContaining(['BIRTHDAY_BONUS_GRANTED', 'FREQUENT_CUSTOMERS_UPDATED']),
      );
      expect(await values('MissionStatus')).toEqual(['ACTIVE', 'DELETED']);
      expect(await values('MissionObjectiveType')).toEqual(['CONSUMPTION_COUNT', 'CONSUMPTION_AMOUNT']);
      expect(await values('CustomerMissionStatus')).toEqual(['IN_PROGRESS', 'COMPLETED', 'CLAIMED', 'EXPIRED']);
      expect(await values('NotificationType')).toEqual(['POINTS_EXPIRING', 'BIRTHDAY', 'PROMOTION', 'MISSION']);
      expect(await values('NotificationChannel')).toEqual(['EMAIL']);
      expect(await values('NotificationStatus')).toEqual(['SENT', 'FAILED', 'SKIPPED']);
      expect(await values('PromotionSendStatus')).toEqual(['SCHEDULED', 'SENT', 'CANCELLED']);
    });
  });

  // --- CA-B5.2 ---

  describe('CA-B5.2: missions', () => {
    it('una misión válida y las variantes permitidas se aceptan (control)', async () => {
      await expect(insertMission()).resolves.toEqual(expect.any(Number));
      await expect(
        insertMission({ name: `'Gasto del mes'`, objective_type: `'CONSUMPTION_AMOUNT'`, target: '20000.50' }),
      ).resolves.toEqual(expect.any(Number));
      await expect(insertMission({ name: `'Sin premio'`, reward_points: 'NULL' })).resolves.toEqual(expect.any(Number));
      await expect(
        insertMission({
          name: `'Viernes de noche'`,
          days_of_week: 'ARRAY[5, 6]::smallint[]',
          time_from: `'20:00'`,
          time_to: `'23:30'`,
          end_month: `'2026-11-01'`,
        }),
      ).resolves.toEqual(expect.any(Number));
      await expect(
        insertMission({ name: `'Dada de baja'`, status: `'DELETED'`, deleted_at: 'now()' }),
      ).resolves.toEqual(expect.any(Number));
    });

    it.each([
      ['target = 0', { target: '0' }, 'missions_target_check'],
      ['target negativo', { target: '-1' }, 'missions_target_check'],
      ['cantidad de consumos con decimales', { target: '2.5' }, 'missions_target_whole_count_check'],
      ['reward_points = 0', { reward_points: '0' }, 'missions_reward_points_check'],
      ['reward_points mayor a 100.000', { reward_points: '100001' }, 'missions_reward_points_check'],
      ['una sola de las dos horas (desde)', { time_from: `'20:00'` }, 'missions_time_range_check'],
      ['una sola de las dos horas (hasta)', { time_to: `'23:00'` }, 'missions_time_range_check'],
      ['hora desde posterior a hasta', { time_from: `'23:00'`, time_to: `'20:00'` }, 'missions_time_range_check'],
      ['hora desde igual a hasta', { time_from: `'20:00'`, time_to: `'20:00'` }, 'missions_time_range_check'],
      ['día de la semana 8', { days_of_week: 'ARRAY[8]::smallint[]' }, 'missions_days_of_week_check'],
      ['día de la semana 0', { days_of_week: 'ARRAY[1, 0]::smallint[]' }, 'missions_days_of_week_check'],
      ['end_month anterior a start_month', { end_month: `'2026-10-01'` }, 'missions_end_month_check'],
      ['dada de baja sin deleted_at', { status: `'DELETED'` }, 'missions_deleted_at_check'],
      ['activa con deleted_at', { deleted_at: 'now()' }, 'missions_deleted_at_check'],
    ])('la base rechaza: %s', async (_name, overrides, constraint) => {
      await expect(insertMission(overrides)).rejects.toThrow(constraint);
    });

    it('dos misiones no dadas de baja no pueden llamarse igual (sin importar mayúsculas ni espacios de los extremos)', async () => {
      await insertMission({ name: `'Brunch'` });

      await expect(insertMission({ name: `'  BRUNCH '` })).rejects.toThrow('missions_active_name_key');
    });

    it('un nombre de una misión dada de baja queda libre', async () => {
      await insertMission({ name: `'Brunch'`, status: `'DELETED'`, deleted_at: 'now()' });

      await expect(insertMission({ name: `'brunch'` })).resolves.toEqual(expect.any(Number));
    });
  });

  describe('CA-B5.2: customer_missions', () => {
    it('los tres estados con sus fechas coherentes se aceptan (control)', async () => {
      const missionId = await insertMission();
      await expect(
        insertCustomerMission({ period: `'2026-11-01'`, progress: '3', status: `'COMPLETED'`, completed_at: 'now()' }, missionId),
      ).resolves.toEqual(expect.any(Number));
      await expect(
        insertCustomerMission(
          {
            period: `'2026-12-01'`,
            progress: '3',
            status: `'CLAIMED'`,
            completed_at: 'now()',
            claimed_at: 'now()',
            claimed_by: `'CUSTOMER'`,
          },
          missionId,
        ),
      ).resolves.toEqual(expect.any(Number));
      await expect(
        insertCustomerMission(
          { period: `'2027-01-01'`, status: `'EXPIRED'`, expired_at: 'now()', expiration_reason: `'Fin de mes'` },
          missionId,
        ),
      ).resolves.toEqual(expect.any(Number));
    });

    it.each([
      ['progress mayor que target', { progress: '4' }, 'customer_missions_progress_check'],
      ['progress negativo', { progress: '-1' }, 'customer_missions_progress_check'],
      ['completada sin completed_at', { status: `'COMPLETED'` }, 'customer_missions_completed_at_check'],
      ['en progreso con completed_at', { completed_at: 'now()' }, 'customer_missions_completed_at_check'],
      [
        'reclamada sin claimed_at',
        { status: `'CLAIMED'`, completed_at: 'now()', claimed_by: `'CUSTOMER'` },
        'customer_missions_claimed_at_check',
      ],
      [
        'reclamada sin claimed_by',
        { status: `'CLAIMED'`, completed_at: 'now()', claimed_at: 'now()' },
        'customer_missions_claimed_by_check',
      ],
      [
        'claimed_by que no es CUSTOMER ni SYSTEM',
        { status: `'CLAIMED'`, completed_at: 'now()', claimed_at: 'now()', claimed_by: `'ADMIN'` },
        'customer_missions_claimed_by_check',
      ],
      ['claimed_by en una misión en progreso', { claimed_by: `'SYSTEM'` }, 'customer_missions_claimed_by_check'],
      [
        'vencida sin motivo',
        { status: `'EXPIRED'`, expired_at: 'now()' },
        'customer_missions_expiration_reason_check',
      ],
      [
        'vencida sin expired_at',
        { status: `'EXPIRED'`, expiration_reason: `'Fin de mes'` },
        'customer_missions_expired_at_check',
      ],
      ['motivo de vencimiento en una misión en progreso', { expiration_reason: `'Fin de mes'` }, 'customer_missions_expiration_reason_check'],
    ])('la base rechaza: %s', async (_name, overrides, constraint) => {
      await expect(insertCustomerMission(overrides)).rejects.toThrow(constraint);
    });

    it('una asignación repetida (misma misión, cliente y mes) se rechaza; en otro mes se acepta', async () => {
      const missionId = await insertMission();
      await insertCustomerMission({}, missionId);

      await expect(insertCustomerMission({}, missionId)).rejects.toThrow(
        'customer_missions_mission_id_customer_id_period_key',
      );
      await expect(insertCustomerMission({ period: `'2026-12-01'` }, missionId)).resolves.toEqual(expect.any(Number));
    });
  });

  describe('CA-B5.2: points_movements (misiones)', () => {
    it('un MISSION_REWARD sin customer_mission_id se rechaza', async () => {
      await expect(insertMovement()).rejects.toThrow('points_movements_mission_check');
    });

    it('un movimiento de otro tipo con customer_mission_id se rechaza', async () => {
      const customerMissionId = await insertCustomerMission();

      await expect(
        insertMovement({
          type: `'MANUAL_ADJUSTMENT'`,
          reason: `'Ajuste'`,
          customer_mission_id: String(customerMissionId),
        }),
      ).rejects.toThrow('points_movements_mission_check');
    });

    it('un MISSION_REWARD con su asignación se acepta, y una misma asignación no puede cobrarse dos veces', async () => {
      const customerMissionId = await insertCustomerMission();

      await expect(insertMovement({ customer_mission_id: String(customerMissionId) })).resolves.toEqual(
        expect.any(Number),
      );
      await expect(insertMovement({ customer_mission_id: String(customerMissionId) })).rejects.toThrow(
        'points_movements_customer_mission_id_key',
      );
    });

    it('un BIRTHDAY_BONUS no lleva asignación y se acepta', async () => {
      await expect(insertMovement({ type: `'BIRTHDAY_BONUS'` })).resolves.toEqual(expect.any(Number));
    });
  });

  describe('CA-B5.2: configuración (cumpleaños, plantillas y cliente frecuente)', () => {
    afterEach(async () => {
      await prisma.$executeRawUnsafe('UPDATE notification_settings SET birthday_bonus_points = 100');
    });

    it.each([-1, 10001])('birthday_bonus_points = %i se rechaza', async (value) => {
      await expect(
        prisma.$executeRawUnsafe(`UPDATE notification_settings SET birthday_bonus_points = ${value}`),
      ).rejects.toThrow('notification_settings_birthday_bonus_points_check');
    });

    it.each([0, 10000])('birthday_bonus_points = %i se acepta (0 = no regala puntos)', async (value) => {
      await expect(
        prisma.$executeRawUnsafe(`UPDATE notification_settings SET birthday_bonus_points = ${value}`),
      ).resolves.toBe(1);
    });

    it('notification_settings es de una sola fila (id = 1)', async () => {
      await expect(
        prisma.$executeRawUnsafe(
          'INSERT INTO notification_settings (id, birthday_bonus_points, updated_at) VALUES (2, 50, now())',
        ),
      ).rejects.toThrow('notification_settings_singleton_check');
    });

    it('una plantilla de tipo PROMOTION se rechaza: las promociones no tienen mensaje automático', async () => {
      await expect(
        prisma.$executeRawUnsafe(
          `INSERT INTO notification_templates (type, active, subject, body, updated_at)
           VALUES ('PROMOTION', true, 'Asunto', 'Mensaje', now())`,
        ),
      ).rejects.toThrow('notification_templates_type_check');
    });

    it.each([0, 101])('frequent_min_consumptions = %i se rechaza', async (value) => {
      await createConfiguration();

      await expect(
        prisma.$executeRawUnsafe(`UPDATE loyalty_program_configurations SET frequent_min_consumptions = ${value}`),
      ).rejects.toThrow('loyalty_program_configurations_frequent_min_check');
    });

    it.each([1, 100])('frequent_min_consumptions = %i se acepta', async (value) => {
      await createConfiguration();

      await expect(
        prisma.$executeRawUnsafe(`UPDATE loyalty_program_configurations SET frequent_min_consumptions = ${value}`),
      ).resolves.toBe(1);
    });
  });

  describe('CA-B5.2: promotion_sends', () => {
    it('un envío inmediato, uno programado y uno cancelado, con sus fechas coherentes, se aceptan (control)', async () => {
      await expect(insertPromotionSend({ level: `'GOLD'` })).resolves.toEqual(expect.any(Number));
      await expect(
        insertPromotionSend({ status: `'SCHEDULED'`, scheduled_at: `now() + interval '1 day'`, sent_at: 'NULL' }),
      ).resolves.toEqual(expect.any(Number));
      await expect(
        insertPromotionSend({
          status: `'CANCELLED'`,
          scheduled_at: `now() + interval '1 day'`,
          sent_at: 'NULL',
          cancelled_at: 'now()',
        }),
      ).resolves.toEqual(expect.any(Number));
    });

    it.each([
      ['un nivel que no es BRONZE, SILVER ni GOLD', { level: `'PLATINUM'` }, 'promotion_sends_level_check'],
      [
        'programado sin scheduled_at',
        { status: `'SCHEDULED'`, sent_at: 'NULL' },
        'promotion_sends_scheduled_check',
      ],
      [
        'programado con sent_at',
        { status: `'SCHEDULED'`, scheduled_at: `now() + interval '1 day'` },
        'promotion_sends_scheduled_check',
      ],
      ['enviado sin sent_at', { sent_at: 'NULL' }, 'promotion_sends_sent_check'],
      ['cancelado sin cancelled_at', { status: `'CANCELLED'`, sent_at: 'NULL' }, 'promotion_sends_cancelled_check'],
      ['enviado con cancelled_at', { cancelled_at: 'now()' }, 'promotion_sends_cancelled_check'],
    ])('la base rechaza: %s', async (_name, overrides, constraint) => {
      await expect(insertPromotionSend(overrides)).rejects.toThrow(constraint);
    });
  });

  describe('CA-B5.2: notifications', () => {
    it('una notificación enviada, una fallida con su error y un reenvío se aceptan (control)', async () => {
      await expect(insertNotification()).resolves.toEqual(expect.any(Number));
      const failedId = await insertNotification({
        dedupe_key: `'lot:2'`,
        status: `'FAILED'`,
        error: `'The to address is not valid.'`,
      });
      await expect(
        insertNotification({ dedupe_key: `'resend:${failedId}'`, resent_from_id: String(failedId) }),
      ).resolves.toEqual(expect.any(Number));
    });

    it('una PROMOTION sin promotion_send_id se rechaza', async () => {
      await expect(
        insertNotification({ type: `'PROMOTION'`, dedupe_key: `'promotion-send:1'` }),
      ).rejects.toThrow('notifications_promotion_send_check');
    });

    it('una notificación de otro tipo con promotion_send_id se rechaza; una PROMOTION con su envío se acepta', async () => {
      const sendId = await insertPromotionSend();

      await expect(insertNotification({ promotion_send_id: String(sendId) })).rejects.toThrow(
        'notifications_promotion_send_check',
      );
      await expect(
        insertNotification({
          type: `'PROMOTION'`,
          dedupe_key: `'promotion-send:${sendId}'`,
          promotion_send_id: String(sendId),
        }),
      ).resolves.toEqual(expect.any(Number));
    });

    it('el error existe si y solo si la notificación falló', async () => {
      await expect(insertNotification({ status: `'FAILED'` })).rejects.toThrow('notifications_error_check');
      await expect(insertNotification({ error: `'Algo falló'` })).rejects.toThrow('notifications_error_check');
      await expect(insertNotification({ status: `'SKIPPED'`, error: `'Algo falló'` })).rejects.toThrow(
        'notifications_error_check',
      );
    });

    it('una notificación repetida (mismo tipo, cliente y motivo) se rechaza; otro motivo se acepta', async () => {
      await insertNotification({ dedupe_key: `'lot:7'` });

      await expect(insertNotification({ dedupe_key: `'lot:7'` })).rejects.toThrow(
        'notifications_type_customer_id_dedupe_key_key',
      );
      await expect(insertNotification({ dedupe_key: `'lot:8'` })).resolves.toEqual(expect.any(Number));
    });

    it('un correo que falló no se puede reenviar dos veces', async () => {
      const failedId = await insertNotification({ status: `'FAILED'`, error: `'Timeout'` });
      await insertNotification({ dedupe_key: `'resend:a'`, resent_from_id: String(failedId) });

      await expect(
        insertNotification({ dedupe_key: `'resend:b'`, resent_from_id: String(failedId) }),
      ).rejects.toThrow('notifications_resent_from_id_key');
    });
  });

  // --- CA-B5.3 ---

  describe('CA-B5.3: notifications es solo inserción', () => {
    it('la base rechaza UPDATE, DELETE y TRUNCATE', async () => {
      const id = await insertNotification();

      await expect(prisma.$executeRaw`UPDATE notifications SET subject = 'otro' WHERE id = ${id}`).rejects.toThrow(
        /append-only/,
      );
      await expect(prisma.$executeRaw`DELETE FROM notifications WHERE id = ${id}`).rejects.toThrow(/append-only/);
      await expect(prisma.$executeRawUnsafe('TRUNCATE TABLE notifications')).rejects.toThrow(/append-only/);

      expect((await prisma.notification.findUnique({ where: { id } }))?.subject).toBe('Tus puntos están por vencer');
    });

    it('el helper de los tests la vacía y deja el trigger prendido', async () => {
      await insertNotification();

      await deleteNotifications(prisma);
      expect(await prisma.notification.count()).toBe(0);

      const id = await insertNotification();
      await expect(prisma.$executeRaw`DELETE FROM notifications WHERE id = ${id}`).rejects.toThrow(/append-only/);
    });
  });

  // --- CA-B5.4 ---

  describe('CA-B5.4: valores por defecto', () => {
    it('una plantilla por tipo AUTOMÁTICO (no PROMOTION), con los textos del contrato §3.6.1, todas activas', async () => {
      const templates = await prisma.notificationTemplate.findMany({ orderBy: { type: 'asc' } });

      expect(templates.map((template) => template.type)).toEqual(['POINTS_EXPIRING', 'BIRTHDAY', 'MISSION']);
      expect(templates.every((template) => template.active)).toBe(true);
      const byType = Object.fromEntries(templates.map((template) => [template.type, template]));
      expect(byType.POINTS_EXPIRING).toMatchObject({
        subject: 'Tus puntos están por vencer',
        body: 'Hola {nombre}: tenés {puntos} pts que vencen el {fecha}. ¡Usalos antes de que caduquen!',
      });
      expect(byType.BIRTHDAY).toMatchObject({
        subject: '¡Feliz cumpleaños!',
        body: '¡Feliz cumpleaños, {nombre}! Te regalamos {puntos} pts para celebrar con nosotros.',
      });
      expect(byType.MISSION).toMatchObject({
        subject: '¡Completaste una misión!',
        body: '¡Bien, {nombre}! Completaste la misión {mision}. Entrá a Vitto Club para ver tu recompensa.',
      });
    });

    it('notification_settings tiene su única fila con 100 puntos de cumpleaños (y sin columnas de logo)', async () => {
      const settings = await prisma.notificationSettings.findMany();
      expect(settings).toEqual([expect.objectContaining({ id: 1, birthdayBonusPoints: 100 })]);

      const columns = await prisma.$queryRaw<{ column_name: string }[]>`
        SELECT column_name FROM information_schema.columns WHERE table_name = 'notification_settings'
      `;
      expect(columns.map((column) => column.column_name).sort()).toEqual([
        'birthday_bonus_points',
        'id',
        'updated_at',
      ]);
    });

    it('la configuración del programa nace con mínimo de cliente frecuente 3 y sin beneficios', async () => {
      const configuration = await createConfiguration();

      expect(configuration).toMatchObject({
        frequentMinConsumptions: 3,
        bronzeBenefit: null,
        silverBenefit: null,
        goldBenefit: null,
      });
    });

    it('clientes y recompensas nacen sin foto', async () => {
      const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
      const reward = await prisma.reward.create({ data: { name: 'Café + medialuna', points: 150 } });

      expect(customer).toMatchObject({ photoPublicId: null, photoUrl: null });
      expect(reward).toMatchObject({ photoPublicId: null, photoUrl: null });
    });
  });
});
