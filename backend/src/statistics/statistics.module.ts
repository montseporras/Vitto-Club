import { Module } from '@nestjs/common';
import { StatisticsRepository } from './domain/port/statistics.repository.js';
import { StatisticsPrismaRepository } from './infrastructure/statistics.repository.js';

// BASE-5 (contrato S5 §8.4): esqueleto del módulo `statistics`, de solo lectura. Lee las tablas por
// Prisma y NO importa ningún módulo de negocio (como `points` lee `customers`). Las métricas y el PDF
// los agregan US-51 a US-55.
@Module({
  providers: [{ provide: StatisticsRepository, useClass: StatisticsPrismaRepository }],
})
export class StatisticsModule {}
