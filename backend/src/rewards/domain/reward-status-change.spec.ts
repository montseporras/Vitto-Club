import { activationResult, canActivate, canDeactivate, DEACTIVATED } from './reward-status-change.js';

const TODAY = '2026-11-08';

// Lo único que mira activationResult: el stock y la fecha
const reward = (stock: number | null, expiresAt: string | null) => ({ getStock: () => stock, getExpiresAt: () => expiresAt });

describe('activar y desactivar — US-36', () => {
  it.each([
    ['ACTIVE', false, true],
    ['DISABLED', false, true],
    ['INACTIVE', true, false],
    ['DELETED', false, false],
  ] as const)('%s: activar %s, desactivar %s (CA-36.6)', (status, activate, deactivate) => {
    expect(canActivate(status)).toBe(activate);
    expect(canDeactivate(status)).toBe(deactivate);
  });

  describe('activationResult() — §3.2.5', () => {
    it('con stock y sin vencer → ACTIVE (CA-36.4)', () => {
      expect(activationResult(reward(5, '2026-12-01'), TODAY)).toEqual({ status: 'ACTIVE', disabledReason: null });
    });

    it('sin límite y sin vencimiento → ACTIVE', () => {
      expect(activationResult(reward(null, null), TODAY).status).toBe('ACTIVE');
    });

    it('vence hoy → ACTIVE', () => {
      expect(activationResult(reward(5, TODAY), TODAY).status).toBe('ACTIVE');
    });

    it('stock 0 → DISABLED / OUT_OF_STOCK (CA-36.5)', () => {
      expect(activationResult(reward(0, null), TODAY)).toEqual({ status: 'DISABLED', disabledReason: 'OUT_OF_STOCK' });
    });

    it('vencida → DISABLED / EXPIRED (CA-36.5)', () => {
      expect(activationResult(reward(5, '2026-11-07'), TODAY)).toEqual({ status: 'DISABLED', disabledReason: 'EXPIRED' });
    });

    it('sin stock y vencida a la vez → "Vencida" (la misma regla que US-37)', () => {
      expect(activationResult(reward(0, '2026-11-07'), TODAY).disabledReason).toBe('EXPIRED');
    });
  });

  it('desactivar → INACTIVE sin motivo (CA-36.3)', () => {
    expect(DEACTIVATED).toEqual({ status: 'INACTIVE', disabledReason: null });
  });
});
