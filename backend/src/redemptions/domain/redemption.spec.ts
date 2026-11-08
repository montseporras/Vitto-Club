import { DomainError } from './errors/domain.error.js';
import {
  Redemption,
  REDEMPTION_DURATION_MS,
  SYSTEM_RESOLVER_NAME,
  type RedemptionProps,
  type RedemptionStatus,
} from './redemption.js';

const createdAt = new Date('2026-11-07T15:00:00.000Z');
const expiresAt = new Date(createdAt.getTime() + REDEMPTION_DURATION_MS);
const seconds = (n: number) => n * 1000;

function redemption(overrides: Partial<RedemptionProps> = {}): Redemption {
  return Redemption.reconstruct({
    id: 1,
    code: 'K7MP2X',
    customerId: 10,
    rewardId: 20,
    rewardName: 'Café + medialuna',
    points: 150,
    status: 'CONFIRMED',
    origin: 'APP',
    confirmedByAccountId: null,
    confirmedByName: null,
    createdAt,
    expiresAt,
    resolvedAt: null,
    resolvedByAccountId: null,
    resolvedByName: null,
    rejectionReason: null,
    balanceBefore: null,
    balanceAfter: null,
    ...overrides,
  });
}

describe('Redemption: vencimiento (US-44)', () => {
  it('el canje dura 15 minutos (S4-3)', () => {
    expect(REDEMPTION_DURATION_MS).toBe(15 * 60 * 1000);
  });

  describe('isExpired (CA-44.6)', () => {
    it('a los 14:59 no venció', () => {
      const now = new Date(createdAt.getTime() + REDEMPTION_DURATION_MS - seconds(1));
      expect(redemption().isExpired(now)).toBe(false);
    });

    it('a los 15:00 exactos venció (expiresAt <= ahora)', () => {
      expect(redemption().isExpired(expiresAt)).toBe(true);
    });

    it('después de los 15:00 venció', () => {
      expect(redemption().isExpired(new Date(expiresAt.getTime() + seconds(1)))).toBe(true);
    });

    it.each<RedemptionStatus>(['USED', 'REJECTED', 'CANCELLED', 'EXPIRED'])(
      'un canje %s nunca vence, aunque haya pasado la hora (CA-44.5)',
      (status) => {
        const later = new Date(expiresAt.getTime() + seconds(60));
        expect(redemption({ status, resolvedAt: later }).isExpired(later)).toBe(false);
      },
    );
  });

  describe('expire (CA-44.4)', () => {
    it('pasa a EXPIRED, resuelto por el Sistema, con resolvedAt = expiresAt (no la hora del barrido)', () => {
      const sweepTime = new Date(expiresAt.getTime() + seconds(4 * 60));
      const r = redemption();

      r.expire(sweepTime);

      expect(r.getStatus()).toBe('EXPIRED');
      expect(r.getResolvedAt()).toEqual(expiresAt);
      expect(r.getResolvedByAccountId()).toBeNull();
      expect(r.getResolvedByName()).toBe(SYSTEM_RESOLVER_NAME);
      expect(SYSTEM_RESOLVER_NAME).toBe('Sistema');
    });

    it('no toca los puntos, el motivo ni los saldos (sin reintegro)', () => {
      const r = redemption();

      r.expire(expiresAt);

      expect(r.getPoints()).toBe(150);
      expect(r.getRejectionReason()).toBeNull();
      expect(r.getBalanceBefore()).toBeNull();
      expect(r.getBalanceAfter()).toBeNull();
    });

    it('rechaza un canje que todavía no venció', () => {
      const r = redemption();
      expect(() => r.expire(new Date(expiresAt.getTime() - seconds(1)))).toThrow(DomainError);
      expect(r.getStatus()).toBe('CONFIRMED');
    });

    it.each<RedemptionStatus>(['USED', 'REJECTED', 'CANCELLED', 'EXPIRED'])(
      'rechaza un canje %s',
      (status) => {
        const r = redemption({ status, resolvedAt: expiresAt });
        expect(() => r.expire(new Date(expiresAt.getTime() + seconds(60)))).toThrow(DomainError);
        expect(r.getStatus()).toBe(status);
      },
    );
  });
});
