// Error de validación o regla de negocio del dominio: se responde como HTTP 400.
// Cualquier otro Error (base de datos, bug) NO es de dominio y se responde como 500.
// Copia intencional del homónimo de los demás módulos (cada módulo tiene el suyo).
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
