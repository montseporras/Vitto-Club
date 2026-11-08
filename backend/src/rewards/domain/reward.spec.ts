import { Reward, RewardProps } from './reward.js';

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

// US-42 (CA-42.1 a CA-42.3, §3.9.1 paso 8)
describe('Reward.registerUse()', () => {
  it('con stock: lo descuenta, suma usedCount y no se deshabilita', () => {
    const r = reward({ stock: 20, usedCount: 5 });

    const result = r.registerUse();

    expect(result).toEqual({ disabled: false });
    expect(r.getStock()).toBe(19);
    expect(r.getUsedCount()).toBe(6);
    expect(r.getStatus()).toBe('ACTIVE');
    expect(r.getDisabledReason()).toBeNull();
  });

  it('sin límite de stock (null): no lo toca, solo suma usedCount', () => {
    const r = reward({ stock: null, usedCount: 5 });

    const result = r.registerUse();

    expect(result).toEqual({ disabled: false });
    expect(r.getStock()).toBeNull();
    expect(r.getUsedCount()).toBe(6);
    expect(r.getStatus()).toBe('ACTIVE');
  });

  it('última unidad: stock llega a 0, pasa a DISABLED/OUT_OF_STOCK', () => {
    const r = reward({ stock: 1, usedCount: 19 });

    const result = r.registerUse();

    expect(result).toEqual({ disabled: true });
    expect(r.getStock()).toBe(0);
    expect(r.getUsedCount()).toBe(20);
    expect(r.getStatus()).toBe('DISABLED');
    expect(r.getDisabledReason()).toBe('OUT_OF_STOCK');
  });
});
