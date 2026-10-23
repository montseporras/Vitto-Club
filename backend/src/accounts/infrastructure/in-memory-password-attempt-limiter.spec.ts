import { HttpException } from '@nestjs/common';
import { InMemoryPasswordAttemptLimiter } from './in-memory-password-attempt-limiter.js';

const T0 = new Date('2026-10-20T12:00:00.000Z');
const minutesAfter = (minutes: number) => new Date(T0.getTime() + minutes * 60 * 1000);

describe('InMemoryPasswordAttemptLimiter', () => {
  let limiter: InMemoryPasswordAttemptLimiter;

  beforeEach(() => {
    limiter = new InMemoryPasswordAttemptLimiter();
  });

  const fail = (accountId: number, times: number, at = T0) => {
    for (let i = 0; i < times; i++) limiter.recordFailure(accountId, at);
  };

  const blocked = (accountId: number, at: Date): { status: number; code: string } | null => {
    try {
      limiter.assertNotBlocked(accountId, at);
      return null;
    } catch (error) {
      const exception = error as HttpException;
      return { status: exception.getStatus(), code: (exception.getResponse() as { code: string }).code };
    }
  };

  it('con 5 intentos incorrectos anotados, el sexto responde 429 TOO_MANY_ATTEMPTS', () => {
    fail(1, 5);
    expect(blocked(1, T0)).toEqual({ status: 429, code: 'TOO_MANY_ATTEMPTS' });
  });

  it('con 4 incorrectos todavía no bloquea', () => {
    fail(1, 4);
    expect(blocked(1, T0)).toBeNull();
  });

  it('el contador es por cuenta', () => {
    fail(1, 5);
    expect(blocked(2, T0)).toBeNull();
  });

  it('los intentos vencen a los 15 minutos', () => {
    fail(1, 5);
    expect(blocked(1, minutesAfter(14))).not.toBeNull();
    expect(blocked(1, minutesAfter(15))).toBeNull();
  });

  it('la ventana es deslizante: cada intento cuenta desde su propio momento', () => {
    fail(1, 3, T0);
    fail(1, 2, minutesAfter(10));
    expect(blocked(1, minutesAfter(12))).not.toBeNull();
    // A los 16 minutos vencieron los 3 primeros: quedan 2
    expect(blocked(1, minutesAfter(16))).toBeNull();
  });
});
