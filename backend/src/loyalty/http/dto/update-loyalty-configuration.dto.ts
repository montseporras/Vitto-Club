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
  @Max(9_999_999_999.99)
  baseAmount!: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  pointsAwarded!: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  pointsExpirationMonths = 12;

  @IsEnum(FIRST_PURCHASE_BONUS_TYPES)
  bonusType!: FirstPurchaseBonusType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Validate(FirstPurchaseBonusValueValidator)
  bonusValue!: number;
}
