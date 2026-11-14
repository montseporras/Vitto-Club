import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { statisticsMonthError } from '../../domain/statistics-month.js';

// Un solo mensaje por caso, el del contrato (S5 §3.9): falta, formato, futuro o anterior a enero del año pasado
@ValidatorConstraint({ name: 'statisticsMonth', async: false })
export class StatisticsMonthValidator implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return statisticsMonthError(value, new Date()) === null;
  }

  defaultMessage({ value }: ValidationArguments): string {
    return statisticsMonthError(value, new Date()) ?? 'El mes tiene que tener el formato AAAA-MM.';
  }
}
