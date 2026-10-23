import { DomainError } from './errors/domain.error.js';
import { PointsEquivalence } from './points-equivalence.js';

describe('PointsEquivalence', () => {
  it('creates a valid positive amount-to-points rule', () => {
    const equivalence = PointsEquivalence.define({
      baseAmount: 996.5,
      pointsAwarded: 10,
    });

    expect(equivalence.getBaseAmount()).toBe(996.5);
    expect(equivalence.getPointsAwarded()).toBe(10);
  });

  it('accepts the maximum allowed values (1.000.000 and 10.000)', () => {
    const equivalence = PointsEquivalence.define({
      baseAmount: 1_000_000,
      pointsAwarded: 10_000,
    });

    expect(equivalence.getBaseAmount()).toBe(1_000_000);
    expect(equivalence.getPointsAwarded()).toBe(10_000);
  });

  it.each([
    0,
    -1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    1_000_000.01,
    10.123,
    0.001,
  ])('rejects invalid base amount %s', (baseAmount) => {
    expect(() =>
      PointsEquivalence.define({ baseAmount, pointsAwarded: 10 }),
    ).toThrow(DomainError);
  });

  it.each([0, -1, 1.5, Number.NaN, 10_001])(
    'rejects invalid points %s',
    (pointsAwarded) => {
      expect(() =>
        PointsEquivalence.define({ baseAmount: 100, pointsAwarded }),
      ).toThrow(DomainError);
    },
  );
});
