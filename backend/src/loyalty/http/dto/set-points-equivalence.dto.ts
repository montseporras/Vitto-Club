import { IsInt, IsNumber, IsPositive, Max } from 'class-validator';

export class SetPointsEquivalenceDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(9_999_999_999.99)
  baseAmount!: number;

  @IsInt()
  @IsPositive()
  @Max(2_147_483_647)
  pointsAwarded!: number;
}
