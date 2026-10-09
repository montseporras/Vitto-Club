// Puerto propio del módulo para abrir una transacción ambiente (ver docs/ARCHITECTURE.md,
// sección "Transacción ambiente"). La implementación real (PrismaTransactionRunner) se liga
// acá en customers.module.ts; application/ nunca importa Prisma ni @nestjs-cls/transactional
// directamente. Copia intencional del puerto homónimo de employees (cada módulo tiene el suyo).
export abstract class TransactionRunner {
  abstract run<T>(fn: () => Promise<T>): Promise<T>;
}
