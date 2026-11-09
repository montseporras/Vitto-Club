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

// US-42 (§3.9.1 paso 8)
describe('Reward.registerUse()', () => {
  it('con stock: lo descuenta y suma usedCount', () => {
    const r = reward({ stock: 20, usedCount: 5 });

    r.registerUse();

    expect(r.getStock()).toBe(19);
    expect(r.getUsedCount()).toBe(6);
    expect(r.getStatus()).toBe('ACTIVE'); // no decide disponibilidad, eso es de otra pieza
  });

  it('sin límite de stock (null): no lo toca, solo suma usedCount', () => {
    const r = reward({ stock: null, usedCount: 5 });

    r.registerUse();

    expect(r.getStock()).toBeNull();
    expect(r.getUsedCount()).toBe(6);
  });

  it('última unidad: el stock llega a 0, pero el status no cambia acá', () => {
    const r = reward({ stock: 1, usedCount: 19 });

    r.registerUse();

    expect(r.getStock()).toBe(0);
    expect(r.getUsedCount()).toBe(20);
    expect(r.getStatus()).toBe('ACTIVE');
  });
});
