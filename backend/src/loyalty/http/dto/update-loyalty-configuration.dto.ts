import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsPositive,
  Max,
  Validate,
} from 'class-validator';
import { FIRST_CONSUMPTION_BONUS_TYPES } from '../../domain/first-consumption-bonus.js';
import type { FirstConsumptionBonusType } from '../../domain/first-consumption-bonus.js';
import { FirstConsumptionBonusValueValidator } from '../validators/first-consumption-bonus-value.validator.js';

export class UpdateLoyaltyConfigurationDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(1_000_000)
  baseAmount!: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(10_000)
  pointsAwarded!: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(120)
  pointsExpirationMonths = 12;

  @IsEnum(FIRST_CONSUMPTION_BONUS_TYPES)
  bonusType!: FirstConsumptionBonusType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Validate(FirstConsumptionBonusValueValidator)
  bonusValue!: number;
}
