import { estaDisponible } from './reward-availability.js';
import { Reward, RewardProps } from './reward.js';

const HOY = '2026-11-07';

function reward(overrides: Partial<RewardProps> = {}): Reward {
  return Reward.reconstruct({
    id: 6,
    name: 'Medialunas x3',
    description: null,
    points: 100,
    stock: 30,
    expiresAt: '2026-11-30',
    status: 'ACTIVE',
    disabledReason: null,
    usedCount: 0,
    createdAt: new Date('2026-10-01T12:00:00.000Z'),
    updatedAt: new Date('2026-10-01T12:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  });
}

// BASE-4, CA-B4.4 (contrato S4 §3.1, "Disponible")
describe('estaDisponible', () => {
  it('ACTIVE, con stock y sin vencer: disponible', () => {
    expect(estaDisponible(reward(), HOY)).toBe(true);
  });

  it('stock null (sin límite): disponible', () => {
    expect(estaDisponible(reward({ stock: null }), HOY)).toBe(true);
  });

  it('stock 0: no disponible', () => {
    expect(estaDisponible(reward({ stock: 0 }), HOY)).toBe(false);
  });

  it('sin fecha (no vence): disponible', () => {
    expect(estaDisponible(reward({ expiresAt: null }), HOY)).toBe(true);
  });

  it('vence hoy: disponible (expiresAt es el último día en que se puede canjear)', () => {
    expect(estaDisponible(reward({ expiresAt: HOY }), HOY)).toBe(true);
  });

  it('venció ayer: no disponible', () => {
    expect(estaDisponible(reward({ expiresAt: '2026-11-06' }), HOY)).toBe(false);
  });

  it('ACTIVE vencida que el proceso diario todavía no marcó: no disponible', () => {
    expect(estaDisponible(reward({ status: 'ACTIVE', expiresAt: '2026-10-31', stock: null }), HOY)).toBe(false);
  });

  it.each([
    ['DISABLED', 'OUT_OF_STOCK'],
    ['DISABLED', 'EXPIRED'],
    ['INACTIVE', null],
    ['DELETED', null],
  ] as const)('%s: no disponible aunque tenga stock y fecha', (status, disabledReason) => {
    expect(estaDisponible(reward({ status, disabledReason }), HOY)).toBe(false);
  });

  it('cambio de año: 2026-12-31 sigue disponible el 2026-12-31 y no el 2027-01-01', () => {
    const r = reward({ expiresAt: '2026-12-31' });
    expect(estaDisponible(r, '2026-12-31')).toBe(true);
    expect(estaDisponible(r, '2027-01-01')).toBe(false);
  });

  it('hoyArgentina con otro formato: error (no se compara a ciegas)', () => {
    expect(() => estaDisponible(reward(), '7/11/2026')).toThrow('hoyArgentina must be YYYY-MM-DD');
  });
});
