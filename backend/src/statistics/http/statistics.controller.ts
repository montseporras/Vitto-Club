import { Controller, Get, Query, Res, StreamableFile, UseFilters } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../../shared/security/roles.decorator.js';
import { StatisticsReportService } from '../application/statistics-report.service.js';
import { StatisticsService } from '../application/statistics.service.js';
import type {
  ConsumptionsStatistics,
  CustomersStatistics,
  PointsStatistics,
  ProgramStatistics,
} from '../domain/statistics-types.js';
import { StatisticsReportQueryDto, StatisticsQueryDto } from './dto/statistics-query.dto.js';
import { StatisticsExceptionFilter } from './filters/statistics-exception.filter.js';

// §3.9 y matriz de §4: `/estadisticas/*` (incluye `reporte.pdf`) es solo del Administrador. Son consultas: no
// se auditan (§3.14.1).
@Controller('estadisticas')
@Roles('ADMIN')
@UseFilters(StatisticsExceptionFilter)
export class StatisticsController {
  constructor(
    private readonly statisticsService: StatisticsService,
    private readonly statisticsReportService: StatisticsReportService,
  ) {}

  // GET /api/estadisticas/clientes?month=YYYY-MM -> US-51, §3.9.1
  @Get('clientes')
  customers(@Query() query: StatisticsQueryDto): Promise<CustomersStatistics> {
    return this.statisticsService.customers(query.month);
  }

  // GET /api/estadisticas/consumos?month=YYYY-MM -> US-52, §3.9.2
  @Get('consumos')
  consumptions(@Query() query: StatisticsQueryDto): Promise<ConsumptionsStatistics> {
    return this.statisticsService.consumptions(query.month);
  }

  // GET /api/estadisticas/puntos?month=YYYY-MM -> US-53, §3.9.3
  @Get('puntos')
  points(@Query() query: StatisticsQueryDto): Promise<PointsStatistics> {
    return this.statisticsService.points(query.month);
  }

  // GET /api/estadisticas/programa?month=YYYY-MM -> US-54, §3.9.4
  @Get('programa')
  program(@Query() query: StatisticsQueryDto): Promise<ProgramStatistics> {
    return this.statisticsService.program(query.month);
  }

  // GET /api/estadisticas/reporte.pdf?month=YYYY-MM&sections=CUSTOMERS,POINTS -> US-55, §3.9.5
  @Get('reporte.pdf')
  async report(
    @Query() query: StatisticsReportQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename } = await this.statisticsReportService.generate(query.month, query.sections);
    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(buffer);
  }
}
