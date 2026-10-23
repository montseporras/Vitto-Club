// Una entrada de auditoría incompleta o incoherente es un error de programación del que la
// registra, no del usuario: no tiene HTTP propio. Hace fallar (y deshacer) la operación.
export class InvalidAuditEntryError extends Error {
  constructor(message: string) {
    super(`Invalid audit entry: ${message}`);
    this.name = 'InvalidAuditEntryError';
  }
}
