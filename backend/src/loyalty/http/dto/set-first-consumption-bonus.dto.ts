import { IsEnum, IsNumber, Validate } from 'class-validator';
import { FIRST_CONSUMPTION_BONUS_TYPES } from '../../domain/first-consumption-bonus.js';
import { FirstConsumptionBonusValueValidator } from '../validators/first-consumption-bonus-value.validator.js';

export class SetFirstConsumptionBonusDto {
  @IsEnum(FIRST_CONSUMPTION_BONUS_TYPES)
  bonusType!: (typeof FIRST_CONSUMPTION_BONUS_TYPES)[number];

  @IsNumber({ maxDecimalPlaces: 2 })
  @Validate(FirstConsumptionBonusValueValidator)
  bonusValue!: number;
}
