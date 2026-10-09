import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

type BonusValueRequest = {
  bonusType?: string;
};

@ValidatorConstraint({ name: 'firstPurchaseBonusValue', async: false })
export class FirstPurchaseBonusValueValidator implements ValidatorConstraintInterface {
  validate(value: number, args: ValidationArguments): boolean {
    const request = args.object as BonusValueRequest;
    if (request.bonusType === 'PERCENTAGE') {
      return value >= 1 && value <= 100;
    }
    if (request.bonusType === 'FIXED_AMOUNT') {
      return Number.isInteger(value) && value >= 1 && value <= 10_000;
    }
    return false;
  }

  defaultMessage(args: ValidationArguments): string {
    const request = args.object as BonusValueRequest;
    return request.bonusType === 'PERCENTAGE'
      ? 'bonusValue must be between 1 and 100 for percentage bonuses'
      : 'bonusValue must be an integer between 1 and 10000 for fixed bonuses';
  }
}
