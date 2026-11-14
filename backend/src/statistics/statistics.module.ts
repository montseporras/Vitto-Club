import { Module } from '@nestjs/common';
import { StatisticsReportService } from './application/statistics-report.service.js';
import { StatisticsService } from './application/statistics.service.js';
import { ReportRenderer } from './domain/port/report-renderer.js';
import { StatisticsRepository } from './domain/port/statistics.repository.js';
import { StatisticsController } from './http/statistics.controller.js';
import { ReportSectionsValidator } from './http/validators/report-sections.validator.js';
import { StatisticsMonthValidator } from './http/validators/statistics-month.validator.js';
import { PdfKitReportRenderer } from './infrastructure/pdfkit-report-renderer.js';
import { StatisticsPrismaRepository } from './infrastructure/statistics.repository.js';

// BASE-5 (contrato S5 §8.4): módulo `statistics`, de solo lectura. Lee las tablas por Prisma y NO importa
// ningún módulo de negocio (como `points` lee `customers`). Métricas de US-51 a US-54 y PDF de US-55.
@Module({
  controllers: [StatisticsController],
  providers: [
    StatisticsService,
    StatisticsReportService,
    StatisticsMonthValidator,
    ReportSectionsValidator,
    { provide: StatisticsRepository, useClass: StatisticsPrismaRepository },
    { provide: ReportRenderer, useClass: PdfKitReportRenderer },
  ],
})
export class StatisticsModule {}
