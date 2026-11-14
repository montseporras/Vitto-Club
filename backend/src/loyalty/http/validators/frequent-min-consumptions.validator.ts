import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  FREQUENT_MIN_CONSUMPTIONS_MESSAGE,
  frequentMinConsumptionsError,
} from '../../domain/frequent-customers.js';

// Un solo mensaje para cualquier valor inválido (falta, decimal, texto o fuera de 1–100): §3.9.6
@ValidatorConstraint({ name: 'frequentMinConsumptions', async: false })
export class FrequentMinConsumptionsValidator implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return frequentMinConsumptionsError(value) === null;
  }

  defaultMessage(): string {
    return FREQUENT_MIN_CONSUMPTIONS_MESSAGE;
  }
}
