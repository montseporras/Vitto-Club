import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { DEFAULT_POINTS_EXPIRATION_MONTHS } from '../../domain/points-validity.js';

export class SetPointsValidityDto {
  @Transform(
    ({ value }) =>
      value === null || value === '' || value === undefined
        ? DEFAULT_POINTS_EXPIRATION_MONTHS
        : value,
    { toClassOnly: true },
  )
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  pointsExpirationMonths: number = DEFAULT_POINTS_EXPIRATION_MONTHS;
}
