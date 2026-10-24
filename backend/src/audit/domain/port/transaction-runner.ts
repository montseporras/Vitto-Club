// Puerto propio del módulo para abrir una transacción ambiente (ver docs/ARCHITECTURE.md).
export abstract class TransactionRunner {
  abstract run<T>(fn: () => Promise<T>): Promise<T>;
}
