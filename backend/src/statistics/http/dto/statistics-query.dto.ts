import { Validate } from 'class-validator';
import { ReportSectionsValidator } from '../validators/report-sections.validator.js';
import { StatisticsMonthValidator } from '../validators/statistics-month.validator.js';

// Filtro común de las estadísticas (S5 §3.9): `month` (`YYYY-MM`), obligatorio. No hay `groupBy` (S5-42):
// forbidNonWhitelisted rechaza cualquier otro parámetro con 400.
export class StatisticsQueryDto {
  @Validate(StatisticsMonthValidator)
  month!: string;
}

// GET /estadisticas/reporte.pdf (§3.9.5): el mes y las secciones, separadas por coma
export class StatisticsReportQueryDto extends StatisticsQueryDto {
  @Validate(ReportSectionsValidator)
  sections!: string;
}
