// Puerto propio del módulo para abrir una transacción ambiente. La implementación real
// (PrismaTransactionRunner) se liga en notifications.module.ts; application/ nunca importa Prisma ni
// @nestjs-cls/transactional directamente. Copia intencional del puerto homónimo de los demás módulos
// (cada módulo tiene el suyo).
export abstract class TransactionRunner {
  abstract run<T>(fn: () => Promise<T>): Promise<T>;
}
