import { IsEnum, IsNumber, Validate } from 'class-validator';
import { FIRST_PURCHASE_BONUS_TYPES } from '../../domain/first-purchase-bonus.js';
import { FirstPurchaseBonusValueValidator } from '../validators/first-purchase-bonus-value.validator.js';

export class SetFirstPurchaseBonusDto {
  @IsEnum(FIRST_PURCHASE_BONUS_TYPES)
  bonusType!: (typeof FIRST_PURCHASE_BONUS_TYPES)[number];

  @IsNumber({ maxDecimalPlaces: 2 })
  @Validate(FirstPurchaseBonusValueValidator)
  bonusValue!: number;
}
