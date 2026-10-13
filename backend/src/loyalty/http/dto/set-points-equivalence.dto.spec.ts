import { validate } from 'class-validator';
import { SetPointsEquivalenceDto } from './set-points-equivalence.dto.js';

describe('SetPointsEquivalenceDto', () => {
  function dto(
    baseAmount: unknown,
    pointsAwarded: unknown,
  ): SetPointsEquivalenceDto {
    return Object.assign(new SetPointsEquivalenceDto(), {
      baseAmount,
      pointsAwarded,
    });
  }

  it('accepts a positive decimal purchase amount and a positive integer points amount', async () => {
    const errors = await validate(dto(996.5, 10));
    expect(errors).toHaveLength(0);
  });

  it.each([
    [0, 10],
    [-1, 10],
    [10.123, 10],
    [100, 0],
    [100, 1.5],
  ])(
    'rejects baseAmount=%s and pointsAwarded=%s',
    async (baseAmount, pointsAwarded) => {
      const errors = await validate(dto(baseAmount, pointsAwarded));
      expect(errors.length).toBeGreaterThan(0);
    },
  );
});
