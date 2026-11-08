import { Redemption, RedemptionProps } from './redemption.js';

function redemption(overrides: Partial<RedemptionProps> = {}): Redemption {
  return Redemption.reconstruct({
    id: 10,
    code: 'A2B3C4',
    customerId: 101,
    rewardId: 6,
    rewardName: 'Medialunas x3',
    points: 150,
    status: 'CONFIRMED',
    origin: 'COUNTER',
    confirmedByAccountId: 2,
    confirmedByName: 'Bruno Pérez',
    createdAt: new Date('2026-11-08T12:00:00.000Z'),
    expiresAt: new Date('2026-11-08T12:15:00.000Z'),
    resolvedAt: null,
    resolvedByAccountId: null,
    resolvedByName: null,
    rejectionReason: null,
    balanceBefore: null,
    balanceAfter: null,
    ...overrides,
  });
}

// US-42 (CA-42.1, §3.9.1 paso 9)
describe('Redemption.use()', () => {
  it('pasa a USED con resolvedAt/resolvedBy y el saldo antes/después', () => {
    const r = redemption();
    const now = new Date('2026-11-08T12:05:00.000Z');

    r.use({
      resolvedByAccountId: 2,
      resolvedByName: 'Bruno Pérez',
      balanceBefore: 1240,
      balanceAfter: 1090,
      now,
    });

    expect(r.getStatus()).toBe('USED');
    expect(r.getResolvedAt()).toEqual(now);
    expect(r.getResolvedByAccountId()).toBe(2);
    expect(r.getResolvedByName()).toBe('Bruno Pérez');
    expect(r.getBalanceBefore()).toBe(1240);
    expect(r.getBalanceAfter()).toBe(1090);
  });
});
