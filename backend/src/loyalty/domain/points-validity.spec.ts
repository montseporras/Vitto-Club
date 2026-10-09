import { DomainError } from './errors/domain.error.js';
import {
  DEFAULT_POINTS_EXPIRATION_MONTHS,
  PointsValidity,
} from './points-validity.js';

describe('PointsValidity', () => {
  it('defaults omitted or null values to 12 months', () => {
    expect(PointsValidity.define().getPointsExpirationMonths()).toBe(
      DEFAULT_POINTS_EXPIRATION_MONTHS,
    );
    expect(
      PointsValidity.define({
        pointsExpirationMonths: null,
      }).getPointsExpirationMonths(),
    ).toBe(12);
  });

  it('accepts a positive integer custom value', () => {
    expect(
      PointsValidity.define({
        pointsExpirationMonths: 18,
      }).getPointsExpirationMonths(),
    ).toBe(18);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2_147_483_648])(
    'rejects invalid month value %s',
    (pointsExpirationMonths) => {
      expect(() => PointsValidity.define({ pointsExpirationMonths })).toThrow(
        DomainError,
      );
    },
  );
});
