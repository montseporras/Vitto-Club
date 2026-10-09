import { DomainError } from './errors/domain.error.js';
import { FirstPurchaseBonus } from './first-purchase-bonus.js';

describe('FirstPurchaseBonus', () => {
  it.each([
    ['PERCENTAGE', 15],
    ['PERCENTAGE', 1],
    ['PERCENTAGE', 100],
    ['FIXED_AMOUNT', 30],
    ['FIXED_AMOUNT', 10_000],
  ] as const)('accepts %s bonus with value %s', (bonusType, bonusValue) => {
    const bonus = FirstPurchaseBonus.define({ bonusType, bonusValue });

    expect(bonus.getBonusType()).toBe(bonusType);
    expect(bonus.getBonusValue()).toBe(bonusValue);
  });

  it.each([
    ['PERCENTAGE', 0.1],
    ['PERCENTAGE', 0.99],
    ['PERCENTAGE', 0.09],
    ['PERCENTAGE', 100.01],
    ['PERCENTAGE', 15.123],
    ['FIXED_AMOUNT', 0],
    ['FIXED_AMOUNT', -1],
    ['FIXED_AMOUNT', 1.5],
    ['FIXED_AMOUNT', 10_001],
    ['INVALID', 10],
  ] as const)('rejects %s bonus with value %s', (bonusType, bonusValue) => {
    expect(() =>
      FirstPurchaseBonus.define({
        bonusType: bonusType as 'PERCENTAGE' | 'FIXED_AMOUNT',
        bonusValue,
      }),
    ).toThrow(DomainError);
  });
});
