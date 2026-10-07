// Puerto propio del módulo para abrir una transacción ambiente (ver docs/ARCHITECTURE.md,
// sección "Transacción ambiente"). La implementación real (PrismaTransactionRunner) se liga
// acá en employees.module.ts; application/ nunca importa Prisma ni @nestjs-cls/transactional
// directamente.
export abstract class TransactionRunner {
  abstract run<T>(fn: () => Promise<T>): Promise<T>;
}
