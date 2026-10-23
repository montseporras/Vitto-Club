// CA-BASE.5 / decisión #1: restar más puntos que el saldo disponible (o restar con saldo
// ya negativo) nunca se permite. No extiende DomainError a propósito: quien llama (la
// historia que use ajustar(), p. ej. US-24) lo mapea a 409 INSUFFICIENT_BALANCE, no a 400.
export class InsufficientBalanceError extends Error {
  constructor() {
    super('Cannot subtract more points than the available balance');
    this.name = 'InsufficientBalanceError';
  }
}
