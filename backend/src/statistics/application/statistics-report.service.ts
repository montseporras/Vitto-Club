import { Injectable } from '@nestjs/common';
import { ReportRenderer } from '../domain/port/report-renderer.js';
import { buildReportModel, type ReportData } from '../domain/report-model.js';
import { parseReportSections } from '../domain/report-sections.js';
import { parseStatisticsMonth, previousMonthWindow } from '../domain/statistics-month.js';
import { StatisticsService } from './statistics.service.js';

const two = (value: number): string => String(value).padStart(2, '0');

// US-55 (§3.9.5): el reporte del mes en PDF, solo con las secciones elegidas y con los mismos datos que la pantalla
@Injectable()
export class StatisticsReportService {
  constructor(
    private readonly statisticsService: StatisticsService,
    private readonly reportRenderer: ReportRenderer,
  ) {}

  async generate(
    rawMonth: unknown,
    rawSections: unknown,
    now: Date = new Date(),
  ): Promise<{ buffer: Buffer; filename: string }> {
    // Mes y secciones se validan antes de leer nada
    const month = parseStatisticsMonth(rawMonth, now);
    const sections = parseReportSections(rawSections);

    const data: ReportData = {};
    const jobs: Promise<void>[] = [];
    if (sections.includes('CUSTOMERS')) {
      jobs.push(this.statisticsService.customers(month.value, now).then((result) => void (data.customers = result)));
    }
    if (sections.includes('CONSUMPTIONS')) {
      jobs.push(this.statisticsService.consumptions(month.value, now).then((result) => void (data.consumptions = result)));
    }
    if (sections.includes('POINTS')) {
      jobs.push(this.statisticsService.points(month.value, now).then((result) => void (data.points = result)));
    }
    if (sections.includes('PROGRAM')) {
      jobs.push(this.statisticsService.program(month.value, now).then((result) => void (data.program = result)));
    }
    await Promise.all(jobs);

    const model = buildReportModel({
      month,
      previousMonthValue: previousMonthWindow(month, now).value,
      sections,
      data,
      generatedAt: now,
    });
    const buffer = await this.reportRenderer.render(model);

    // vitto-club-reporte-{YYYY-MM-01}-{YYYY-MM-último día}.pdf: siempre el mes entero, aunque esté en curso
    const filename = `vitto-club-reporte-${month.value}-01-${month.value}-${two(month.lastDay)}.pdf`;
    return { buffer, filename };
  }
}
