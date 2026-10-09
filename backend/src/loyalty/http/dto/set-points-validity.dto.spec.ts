import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SetPointsValidityDto } from './set-points-validity.dto.js';

describe('SetPointsValidityDto', () => {
  async function validated(payload: object): Promise<SetPointsValidityDto> {
    const dto = plainToInstance(SetPointsValidityDto, payload);
    const errors = await validate(dto);
    if (errors.length > 0) {
      throw new Error('DTO validation failed');
    }
    return dto;
  }

  it.each([
    {},
    { pointsExpirationMonths: null },
    { pointsExpirationMonths: '' },
  ])('defaults missing, null, or empty months to 12', async (payload) => {
    const dto = await validated(payload);
    expect(dto.pointsExpirationMonths).toBe(12);
  });

  it('accepts a positive integer custom value', async () => {
    const dto = await validated({ pointsExpirationMonths: 18 });
    expect(dto.pointsExpirationMonths).toBe(18);
  });

  it.each(['abc', '12months', 1.5, 0, -1, 2_147_483_648])(
    'rejects invalid month input %s',
    async (pointsExpirationMonths) => {
      const dto = plainToInstance(SetPointsValidityDto, {
        pointsExpirationMonths,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    },
  );
});
