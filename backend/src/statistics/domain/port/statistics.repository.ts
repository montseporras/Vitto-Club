// BASE-5 (contrato S5 §8.4): puerto StatisticsRepository, sin operaciones todavía. Solo lectura: lee las tablas por Prisma sin importar módulos de negocio (§8.4). Cada historia agrega las operaciones que necesita.
export abstract class StatisticsRepository {}
