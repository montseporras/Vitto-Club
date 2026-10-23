import { Injectable } from '@nestjs/common';
import { tooManyAttempts } from '../domain/errors/too-many-attempts.error.js';
import { PasswordAttemptLimiter } from '../domain/port/password-attempt-limiter.js';

export const MAX_FAILED_ATTEMPTS = 5;
export const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

// Contador en la memoria del proceso (decisión tomada a pedido de Magali, PERFIL: el contrato no dice
// dónde se guarda). Se pierde si el servidor se reinicia y no se comparte entre instancias; para eso
// habría que escribir otro adaptador del puerto (por ejemplo, con una tabla).
// La ventana es deslizante: cada intento incorrecto cuenta durante los 15 minutos siguientes.
@Injectable()
export class InMemoryPasswordAttemptLimiter extends PasswordAttemptLimiter {
  private readonly failures = new Map<number, number[]>();

  assertNotBlocked(accountId: number, now: Date): void {
    if (this.recent(accountId, now).length >= MAX_FAILED_ATTEMPTS) {
      throw tooManyAttempts();
    }
  }

  recordFailure(accountId: number, now: Date): void {
    this.failures.set(accountId, [...this.recent(accountId, now), now.getTime()]);
  }

  // Los intentos de la ventana vigente; borra los vencidos para que el mapa no crezca sin límite
  private recent(accountId: number, now: Date): number[] {
    const since = now.getTime() - ATTEMPT_WINDOW_MS;
    const recent = (this.failures.get(accountId) ?? []).filter((at) => at > since);
    if (recent.length === 0) {
      this.failures.delete(accountId);
    } else {
      this.failures.set(accountId, recent);
    }
    return recent;
  }
}
