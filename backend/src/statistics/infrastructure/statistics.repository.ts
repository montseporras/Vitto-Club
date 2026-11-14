import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import type { DateRange } from '../domain/statistics-month.js';
import {
  type ConsumptionTotals,
  type LevelCount,
  type LevelThresholdsAt,
  type MissionStatusCounts,
  type MonthlyNewCustomers,
  type PointsTotals,
  StatisticsRepository,
  type TimeSlotRow,
  type TopReward,
  type WeekdayRow,
} from '../domain/port/statistics.repository.js';

// Argentina es UTC-3 todo el año (sin horario de verano, como shared/time/argentina-date.ts)
const ART = Prisma.sql`interval '3 hours'`;

// Los timestamps de la base son UTC sin zona. Se compara con el instante pasado como texto ISO y se lo
// lleva a UTC explícitamente, así no depende de la zona de la sesión.
const utc = (date: Date) => Prisma.sql`(${date.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;

const DEFAULT_FREQUENT_MIN_CONSUMPTIONS = 3;

// Prisma devuelve los NUMERIC y los COUNT como Decimal o bigint según el cast: todo se castea en la consulta y
// acá se pasa a number.
const num = (value: unknown): number => Number(value ?? 0);

const LEVEL_CASE = (silver: number, gold: number, lifetime: Prisma.Sql) =>
  Prisma.sql`CASE WHEN ${lifetime} >= ${gold}::int THEN 'GOLD' WHEN ${lifetime} >= ${silver}::int THEN 'SILVER' ELSE 'BRONZE' END`;

const LEVEL_RANK = (silver: number, gold: number, lifetime: Prisma.Sql) =>
  Prisma.sql`CASE WHEN ${lifetime} >= ${gold}::int THEN 2 WHEN ${lifetime} >= ${silver}::int THEN 1 ELSE 0 END`;

// Solo lectura: usa el client de PrismaTransactionRunner para participar de la transacción ambiente, igual
// que los demás módulos, pero nunca escribe.
@Injectable()
export class StatisticsPrismaRepository implements StatisticsRepository {
  constructor(private readonly transactionRunner: PrismaTransactionRunner) {}

  protected get prisma() {
    return this.transactionRunner.client;
  }

  async getFrequentMinConsumptions(): Promise<number> {
    const active = await this.prisma.loyaltyProgramConfiguration.findFirst({
      where: { isActive: true },
      orderBy: { version: 'desc' },
      select: { frequentMinConsumptions: true },
    });
    return active?.frequentMinConsumptions ?? DEFAULT_FREQUENT_MIN_CONSUMPTIONS;
  }

  // Activo en `cutoff`: ya existía y no estaba dado de baja (no hay reactivación)
  async countActiveCustomers(cutoff: Date): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM customers
      WHERE created_at < ${utc(cutoff)}
        AND (is_active = true OR deactivated_at >= ${utc(cutoff)})
    `;
    return num(rows[0]?.count);
  }

  async countNewCustomers(range: DateRange): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM customers
      WHERE created_at >= ${utc(range.from)} AND created_at < ${utc(range.to)}
    `;
    return num(rows[0]?.count);
  }

  async countFrequentCustomers(range: DateRange, minConsumptions: number): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM (
        SELECT customer_id
        FROM consumptions
        WHERE status = 'REGISTERED' AND created_at >= ${utc(range.from)} AND created_at < ${utc(range.to)}
        GROUP BY customer_id
        HAVING COUNT(*) >= ${minConsumptions}::int
      ) frequent
    `;
    return num(rows[0]?.count);
  }

  // S5-53: de los clientes dados de alta en cada mes, los que llegaron al mínimo en ESE mismo mes
  async newCustomersConversion(range: DateRange, minConsumptions: number): Promise<MonthlyNewCustomers[]> {
    const rows = await this.prisma.$queryRaw<{ month: string; new_count: number; new_frequent: number }[]>`
      SELECT
        to_char(m.month_start, 'YYYY-MM') AS month,
        COUNT(*)::int AS new_count,
        COUNT(*) FILTER (WHERE (
          SELECT COUNT(*) FROM consumptions k
          WHERE k.customer_id = c.id
            AND k.status = 'REGISTERED'
            AND k.created_at >= m.month_start + ${ART}
            AND k.created_at < m.month_start + interval '1 month' + ${ART}
        ) >= ${minConsumptions}::int)::int AS new_frequent
      FROM customers c
      CROSS JOIN LATERAL (SELECT date_trunc('month', c.created_at - ${ART}) AS month_start) m
      WHERE c.created_at >= ${utc(range.from)} AND c.created_at < ${utc(range.to)}
      GROUP BY m.month_start
    `;
    return rows.map((row) => ({ month: row.month, new: num(row.new_count), newFrequent: num(row.new_frequent) }));
  }

  async consumptionTotals(range: DateRange): Promise<ConsumptionTotals> {
    const rows = await this.prisma.$queryRaw<{ count: number; amount: number }[]>`
      SELECT COUNT(*)::int AS count, COALESCE(SUM(amount), 0)::float8 AS amount
      FROM consumptions
      WHERE status = 'REGISTERED' AND created_at >= ${utc(range.from)} AND created_at < ${utc(range.to)}
    `;
    return { count: num(rows[0]?.count), amount: num(rows[0]?.amount) };
  }

  // 1 = lunes … 7 = domingo (ISODOW), en hora de Argentina
  async consumptionsByWeekday(range: DateRange): Promise<WeekdayRow[]> {
    const rows = await this.prisma.$queryRaw<{ weekday: number; count: number; amount: number }[]>`
      SELECT EXTRACT(ISODOW FROM created_at - ${ART})::int AS weekday,
             COUNT(*)::int AS count,
             COALESCE(SUM(amount), 0)::float8 AS amount
      FROM consumptions
      WHERE status = 'REGISTERED' AND created_at >= ${utc(range.from)} AND created_at < ${utc(range.to)}
      GROUP BY 1
    `;
    return rows.map((row) => ({ weekday: num(row.weekday), count: num(row.count), amount: num(row.amount) }));
  }

  // 0 = 00:00–08:00 y 1 a 4 = las franjas de 4 horas (mismo criterio que timeSlotIndexOfHour)
  async consumptionsByTimeSlot(range: DateRange): Promise<TimeSlotRow[]> {
    const rows = await this.prisma.$queryRaw<{ slot: number; count: number; amount: number }[]>`
      SELECT CASE WHEN h.hour < 8 THEN 0 ELSE (h.hour - 8) / 4 + 1 END AS slot,
             COUNT(*)::int AS count,
             COALESCE(SUM(c.amount), 0)::float8 AS amount
      FROM consumptions c
      CROSS JOIN LATERAL (SELECT EXTRACT(HOUR FROM c.created_at - ${ART})::int AS hour) h
      WHERE c.status = 'REGISTERED' AND c.created_at >= ${utc(range.from)} AND c.created_at < ${utc(range.to)}
      GROUP BY 1
    `;
    return rows.map((row) => ({ slot: num(row.slot), count: num(row.count), amount: num(row.amount) }));
  }

  // El movimiento del consumo guarda el total (puntos + bonificación): la bonificación sale de
  // consumptions.bonus_points y los puntos del consumo son el resto. Valores absolutos.
  async pointsTotals(range: DateRange): Promise<PointsTotals> {
    const rows = await this.prisma.$queryRaw<Record<keyof PointsTotals, number>[]>`
      SELECT
        COALESCE(SUM(m.points - COALESCE(c.bonus_points, 0)) FILTER (WHERE m.type = 'CONSUMPTION_CREDIT'), 0)::float8 AS "awarded",
        COALESCE(SUM(c.bonus_points) FILTER (WHERE m.type = 'CONSUMPTION_CREDIT'), 0)::float8 AS "bonus",
        COALESCE(SUM(ABS(m.points)) FILTER (WHERE m.type = 'MISSION_REWARD'), 0)::float8 AS "missionRewards",
        COALESCE(SUM(ABS(m.points)) FILTER (WHERE m.type = 'BIRTHDAY_BONUS'), 0)::float8 AS "birthdayBonus",
        COALESCE(SUM(ABS(m.points)) FILTER (WHERE m.type = 'REDEMPTION'), 0)::float8 AS "redeemed",
        COALESCE(SUM(ABS(m.points)) FILTER (WHERE m.type = 'EXPIRATION'), 0)::float8 AS "expired",
        COALESCE(SUM(ABS(m.points)) FILTER (WHERE m.type = 'VOID_REVERSAL'), 0)::float8 AS "voided"
      FROM points_movements m
      LEFT JOIN consumptions c ON c.id = m.consumption_id
      WHERE m.created_at >= ${utc(range.from)} AND m.created_at < ${utc(range.to)}
    `;
    const row = rows[0];
    return {
      awarded: num(row?.awarded),
      bonus: num(row?.bonus),
      missionRewards: num(row?.missionRewards),
      birthdayBonus: num(row?.birthdayBonus),
      redeemed: num(row?.redeemed),
      expired: num(row?.expired),
      voided: num(row?.voided),
    };
  }

  // La versión de la configuración vigente en `at` (RF-014). Si `at` es anterior a la primera versión, la primera.
  async findLevelThresholdsAt(at: Date): Promise<LevelThresholdsAt> {
    const select = { silverMinPoints: true, goldMinPoints: true } as const;
    const valid = await this.prisma.loyaltyProgramConfiguration.findFirst({
      where: { validFrom: { lte: at }, OR: [{ validTo: null }, { validTo: { gt: at } }] },
      orderBy: { version: 'desc' },
      select,
    });
    const found =
      valid ?? (await this.prisma.loyaltyProgramConfiguration.findFirst({ orderBy: { version: 'asc' }, select }));
    return found ?? { silverMinPoints: 300, goldMinPoints: 800 };
  }

  async countCustomersByLevel(thresholds: LevelThresholdsAt): Promise<LevelCount[]> {
    const level = LEVEL_CASE(thresholds.silverMinPoints, thresholds.goldMinPoints, Prisma.sql`COALESCE(cp.lifetime_points, 0)`);
    const rows = await this.prisma.$queryRaw<{ level: LevelCount['level']; customers: number }[]>`
      SELECT ${level} AS level, COUNT(*)::int AS customers
      FROM customers c
      LEFT JOIN customer_points cp ON cp.customer_id = c.id
      WHERE c.is_active = true
      GROUP BY 1
    `;
    return rows.map((row) => ({ level: row.level, customers: num(row.customers) }));
  }

  // lifetimePoints en un instante = el actual menos los movimientos que lo cambian desde entonces:
  // los créditos de consumos (con su bonificación) y las anulaciones. Canjes, vencimientos, ajustes,
  // misiones y cumpleaños no lo tocan (S5-9).
  async countLevelUps(args: {
    start: Date;
    end: Date;
    thresholdsAtStart: LevelThresholdsAt;
    thresholdsAtEnd: LevelThresholdsAt;
  }): Promise<number> {
    const { start, end, thresholdsAtStart: atStart, thresholdsAtEnd: atEnd } = args;
    const rankAtStart = LEVEL_RANK(atStart.silverMinPoints, atStart.goldMinPoints, Prisma.sql`(t.now_points - t.after_start)`);
    const rankAtEnd = LEVEL_RANK(atEnd.silverMinPoints, atEnd.goldMinPoints, Prisma.sql`(t.now_points - t.after_end)`);
    const rows = await this.prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM (
        SELECT c.id,
               COALESCE(cp.lifetime_points, 0) AS now_points,
               COALESCE(SUM(m.points), 0) AS after_start,
               COALESCE(SUM(m.points) FILTER (WHERE m.created_at >= ${utc(end)}), 0) AS after_end
        FROM customers c
        LEFT JOIN customer_points cp ON cp.customer_id = c.id
        LEFT JOIN points_movements m
          ON m.customer_id = c.id
         AND m.created_at >= ${utc(start)}
         AND m.type IN ('CONSUMPTION_CREDIT', 'VOID_REVERSAL')
        WHERE c.created_at < ${utc(end)}
          AND (c.is_active = true OR c.deactivated_at >= ${utc(end)})
        GROUP BY c.id, cp.lifetime_points
      ) t
      WHERE ${rankAtEnd} > ${rankAtStart}
    `;
    return num(rows[0]?.count);
  }

  async countMissionsByStatus(period: string): Promise<MissionStatusCounts> {
    const rows = await this.prisma.customerMission.groupBy({
      by: ['status'],
      where: { period: new Date(`${period}T00:00:00.000Z`) },
      _count: { _all: true },
    });
    const count = (status: string) => rows.find((row) => row.status === status)?._count._all ?? 0;
    return {
      inProgress: count('IN_PROGRESS'),
      completed: count('COMPLETED'),
      claimed: count('CLAIMED'),
      expired: count('EXPIRED'),
    };
  }

  // Canjes USED del rango (por la fecha en que se registró el uso). El nombre es el del snapshot del canje
  // (el más reciente del mes). Empate de cantidad: por id de recompensa.
  async topRedeemedRewards(range: DateRange, limit: number): Promise<TopReward[]> {
    const rows = await this.prisma.$queryRaw<{ id: number; used: number; name: string }[]>`
      SELECT reward_id AS id,
             COUNT(*)::int AS used,
             (ARRAY_AGG(reward_name ORDER BY resolved_at DESC, id DESC))[1] AS name
      FROM redemptions
      WHERE status = 'USED' AND resolved_at >= ${utc(range.from)} AND resolved_at < ${utc(range.to)}
      GROUP BY reward_id
      ORDER BY used DESC, reward_id ASC
      LIMIT ${limit}::int
    `;
    return rows.map((row) => ({ id: num(row.id), name: row.name, used: num(row.used) }));
  }

  async countUsedRedemptions(range: DateRange): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM redemptions
      WHERE status = 'USED' AND resolved_at >= ${utc(range.from)} AND resolved_at < ${utc(range.to)}
    `;
    return num(rows[0]?.count);
  }
}
