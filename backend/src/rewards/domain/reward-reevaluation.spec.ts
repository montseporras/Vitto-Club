import { DomainError } from './errors/domain.error.js';
import { motivoNoDisponible, reevaluar } from './reward-reevaluation.js';
import { Reward, type RewardProps, type RewardStatus } from './reward.js';

const HOY = '2026-11-07';
const AYER = '2026-11-06';

function reward(overrides: Partial<RewardProps> = {}): Reward {
  return Reward.reconstruct({
    id: 1,
    name: 'Café + medialuna',
    description: null,
    points: 150,
    stock: 5,
    expiresAt: null,
    status: 'ACTIVE',
    disabledReason: null,
    usedCount: 0,
    createdAt: new Date('2026-11-01T12:00:00.000Z'),
    updatedAt: new Date('2026-11-01T12:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  });
}

describe('Disponibilidad automática (US-37, §3.4)', () => {
  describe('motivoNoDisponible', () => {
    it.each([
      [{ stock: 5, expiresAt: null }, null],
      [{ stock: null, expiresAt: HOY }, null],
      [{ stock: 0, expiresAt: null }, 'OUT_OF_STOCK'],
      [{ stock: 5, expiresAt: AYER }, 'EXPIRED'],
      // Fallan las dos: gana "vencida" (decisión de Melisa)
      [{ stock: 0, expiresAt: AYER }, 'EXPIRED'],
    ] as const)('%p → %p', (props, expected) => {
      expect(motivoNoDisponible(reward(props), HOY)).toBe(expected);
    });

    it('vence hoy: sigue disponible (CA-37.3)', () => {
      expect(motivoNoDisponible(reward({ expiresAt: HOY }), HOY)).toBeNull();
    });

    it('exige hoy en YYYY-MM-DD', () => {
      expect(() => motivoNoDisponible(reward(), '07/11/2026')).toThrow();
    });
  });

  describe('reevaluar: una fila por regla de la tabla', () => {
    it('ACTIVE que queda con stock 0 → DISABLED / OUT_OF_STOCK', () => {
      expect(reevaluar(reward({ stock: 0 }), HOY)).toEqual({ kind: 'DISABLED', reason: 'OUT_OF_STOCK' });
    });

    it('ACTIVE con expiresAt < hoy → DISABLED / EXPIRED', () => {
      expect(reevaluar(reward({ expiresAt: AYER }), HOY)).toEqual({ kind: 'DISABLED', reason: 'EXPIRED' });
    });

    it('DISABLED / OUT_OF_STOCK que repuso stock → ENABLED (Stock repuesto)', () => {
      const r = reward({ status: 'DISABLED', disabledReason: 'OUT_OF_STOCK', stock: 3 });
      expect(reevaluar(r, HOY)).toEqual({ kind: 'ENABLED', previousReason: 'OUT_OF_STOCK' });
    });

    it('DISABLED / OUT_OF_STOCK que quedó "Sin límite" → ENABLED', () => {
      const r = reward({ status: 'DISABLED', disabledReason: 'OUT_OF_STOCK', stock: null });
      expect(reevaluar(r, HOY)).toEqual({ kind: 'ENABLED', previousReason: 'OUT_OF_STOCK' });
    });

    it('DISABLED / EXPIRED con la fecha movida a hoy o "No vence" → ENABLED (Fecha actualizada)', () => {
      expect(reevaluar(reward({ status: 'DISABLED', disabledReason: 'EXPIRED', expiresAt: HOY }), HOY)).toEqual({
        kind: 'ENABLED',
        previousReason: 'EXPIRED',
      });
      expect(reevaluar(reward({ status: 'DISABLED', disabledReason: 'EXPIRED', expiresAt: null }), HOY)).toEqual({
        kind: 'ENABLED',
        previousReason: 'EXPIRED',
      });
    });

    it('ACTIVE disponible → sin cambio', () => {
      expect(reevaluar(reward(), HOY)).toBeNull();
    });

    it('DISABLED que sigue igual → sin cambio', () => {
      expect(reevaluar(reward({ status: 'DISABLED', disabledReason: 'OUT_OF_STOCK', stock: 0 }), HOY)).toBeNull();
    });
  });

  describe('reevaluar: cuando fallan dos condiciones (opción i)', () => {
    it('(a) ACTIVE vencida sin marcar que queda con stock 0 → DISABLED / EXPIRED', () => {
      expect(reevaluar(reward({ stock: 0, expiresAt: AYER }), HOY)).toEqual({ kind: 'DISABLED', reason: 'EXPIRED' });
    });

    it('(b) DISABLED / OUT_OF_STOCK que venció y repuso stock → cambia el motivo a EXPIRED', () => {
      const r = reward({ status: 'DISABLED', disabledReason: 'OUT_OF_STOCK', stock: 10, expiresAt: AYER });
      expect(reevaluar(r, HOY)).toEqual({ kind: 'REASON_CHANGED', reason: 'EXPIRED' });
    });

    it('(c) DISABLED / EXPIRED con fecha nueva pero sin stock → cambia el motivo a OUT_OF_STOCK', () => {
      const r = reward({ status: 'DISABLED', disabledReason: 'EXPIRED', stock: 0, expiresAt: HOY });
      expect(reevaluar(r, HOY)).toEqual({ kind: 'REASON_CHANGED', reason: 'OUT_OF_STOCK' });
    });
  });

  it.each<RewardStatus>(['INACTIVE', 'DELETED'])('%s nunca cambia, aunque no esté disponible', (status) => {
    const r = reward({ status, stock: 0, expiresAt: AYER, deletedAt: status === 'DELETED' ? new Date() : null });
    expect(reevaluar(r, HOY)).toBeNull();
  });

  describe('Reward.disable / enable', () => {
    it('disable deja DISABLED con el motivo; enable vuelve a ACTIVE sin motivo', () => {
      const r = reward();

      r.disable('OUT_OF_STOCK');
      expect([r.getStatus(), r.getDisabledReason()]).toEqual(['DISABLED', 'OUT_OF_STOCK']);

      r.disable('EXPIRED');
      expect(r.getDisabledReason()).toBe('EXPIRED');

      r.enable();
      expect([r.getStatus(), r.getDisabledReason()]).toEqual(['ACTIVE', null]);
    });

    it.each<RewardStatus>(['INACTIVE', 'DELETED'])('%s no se deshabilita', (status) => {
      expect(() => reward({ status }).disable('EXPIRED')).toThrow(DomainError);
    });

    it.each<RewardStatus>(['ACTIVE', 'INACTIVE', 'DELETED'])('%s no se habilita', (status) => {
      expect(() => reward({ status }).enable()).toThrow(DomainError);
    });
  });
});
