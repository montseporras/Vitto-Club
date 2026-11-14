import { Injectable } from '@nestjs/common';
import { StatisticsRepository } from '../domain/port/statistics.repository.js';
import type {
  ConsumptionsStatistics,
  CustomersStatistics,
  PointsStatistics,
  ProgramStatistics,
} from '../domain/statistics-types.js';
import {
  fillConversionMonths,
  fillTimeSlots,
  fillWeekdays,
  missionTotals,
  round2,
} from '../domain/statistics-calculations.js';
import { lastSixMonths, parseStatisticsMonth, previousMonthWindow } from '../domain/statistics-month.js';

const TOP_REWARDS_LIMIT = 10;
const LEVELS = ['BRONZE', 'SILVER', 'GOLD'] as const;

// US-51 a US-54: solo lectura. Todo lo calcula el backend (CLAUDE.md §5.1); la pantalla solo dibuja.
// Cada método recibe `now` para poder fijar la fecha en los tests.
@Injectable()
export class StatisticsService {
  constructor(private readonly statisticsRepository: StatisticsRepository) {}

  // US-51 (§3.9.1)
  async customers(rawMonth: unknown, now: Date = new Date()): Promise<CustomersStatistics> {
    const month = parseStatisticsMonth(rawMonth, now);
    const range = { from: month.start, to: month.endExclusive };
    const sixMonths = lastSixMonths(month);
    const minConsumptions = await this.statisticsRepository.getFrequentMinConsumptions();

    const [active, newCustomers, frequent, conversion] = await Promise.all([
      this.statisticsRepository.countActiveCustomers(month.cutoff),
      this.statisticsRepository.countNewCustomers(range),
      this.statisticsRepository.countFrequentCustomers(range, minConsumptions),
      this.statisticsRepository.newCustomersConversion(
        { from: sixMonths[0].range.from, to: sixMonths[5].range.to },
        minConsumptions,
      ),
    ]);

    return {
      active,
      new: newCustomers,
      frequent,
      frequentMinConsumptions: minConsumptions,
      last6Months: fillConversionMonths(
        sixMonths.map((entry) => entry.value),
        conversion,
      ),
    };
  }

  // US-52 (§3.9.2): solo consumos REGISTERED del mes
  async consumptions(rawMonth: unknown, now: Date = new Date()): Promise<ConsumptionsStatistics> {
    const month = parseStatisticsMonth(rawMonth, now);
    const range = { from: month.start, to: month.endExclusive };

    const [total, byWeekday, byTimeSlot] = await Promise.all([
      this.statisticsRepository.consumptionTotals(range),
      this.statisticsRepository.consumptionsByWeekday(range),
      this.statisticsRepository.consumptionsByTimeSlot(range),
    ]);

    return {
      total: { count: total.count, amount: round2(total.amount) },
      byWeekday: fillWeekdays(byWeekday).map((row) => ({ ...row, amount: round2(row.amount) })),
      byTimeSlot: fillTimeSlots(byTimeSlot).map((row) => ({ ...row, amount: round2(row.amount) })),
    };
  }

  // US-53 (§3.9.3): los siete totales del mes y los mismos del mes anterior (mismos días si el mes está en curso)
  async points(rawMonth: unknown, now: Date = new Date()): Promise<PointsStatistics> {
    const month = parseStatisticsMonth(rawMonth, now);
    const previous = previousMonthWindow(month, now);

    const [current, before] = await Promise.all([
      this.statisticsRepository.pointsTotals({ from: month.start, to: month.endExclusive }),
      this.statisticsRepository.pointsTotals(previous.range),
    ]);

    return { ...current, previousMonth: before };
  }

  // US-54 (§3.9.4)
  async program(rawMonth: unknown, now: Date = new Date()): Promise<ProgramStatistics> {
    const month = parseStatisticsMonth(rawMonth, now);
    const range = { from: month.start, to: month.endExclusive };

    const [thresholdsNow, thresholdsAtStart, thresholdsAtEnd] = await Promise.all([
      this.statisticsRepository.findLevelThresholdsAt(now),
      this.statisticsRepository.findLevelThresholdsAt(month.start),
      this.statisticsRepository.findLevelThresholdsAt(month.cutoff),
    ]);

    const [levelCounts, levelUps, missionCounts, topRewards, redemptionsUsed] = await Promise.all([
      this.statisticsRepository.countCustomersByLevel(thresholdsNow),
      this.statisticsRepository.countLevelUps({
        start: month.start,
        end: month.cutoff,
        thresholdsAtStart,
        thresholdsAtEnd,
      }),
      this.statisticsRepository.countMissionsByStatus(`${month.value}-01`),
      this.statisticsRepository.topRedeemedRewards(range, TOP_REWARDS_LIMIT),
      this.statisticsRepository.countUsedRedemptions(range),
    ]);

    return {
      // Los tres niveles siempre, en orden, aunque alguno no tenga clientes
      levels: LEVELS.map((level) => ({
        level,
        customers: levelCounts.find((row) => row.level === level)?.customers ?? 0,
      })),
      levelUps,
      missions: missionTotals(missionCounts),
      topRewards,
      redemptionsUsed,
    };
  }
}
