import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsPositive,
  Max,
  Validate,
} from 'class-validator';
import { FIRST_PURCHASE_BONUS_TYPES } from '../../domain/first-purchase-bonus.js';
import type { FirstPurchaseBonusType } from '../../domain/first-purchase-bonus.js';
import { FirstPurchaseBonusValueValidator } from '../validators/first-purchase-bonus-value.validator.js';

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

  @IsEnum(FIRST_PURCHASE_BONUS_TYPES)
  bonusType!: FirstPurchaseBonusType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Validate(FirstPurchaseBonusValueValidator)
  bonusValue!: number;
}
