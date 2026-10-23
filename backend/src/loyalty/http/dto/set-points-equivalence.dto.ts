import { IsInt, IsNumber, IsPositive, Max } from 'class-validator';

export class SetPointsEquivalenceDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(1_000_000)
  baseAmount!: number;

  @IsInt()
  @IsPositive()
  @Max(10_000)
  pointsAwarded!: number;
}
