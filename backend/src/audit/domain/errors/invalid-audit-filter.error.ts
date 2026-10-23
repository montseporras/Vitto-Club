// Un filtro de consulta inválido: se responde como HTTP 400 (contrato §3.9.4).
// Es distinto de InvalidAuditEntryError, que es un error de quien registra y se responde 500.
export class InvalidAuditFilterError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'InvalidAuditFilterError';
  }
}
