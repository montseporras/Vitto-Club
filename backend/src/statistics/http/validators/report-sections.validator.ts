import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { reportSectionsError, SECTIONS_MESSAGES } from '../../domain/report-sections.js';

// `sections`: falta o vacía → "Elegí al menos una sección."; un valor que no existe o repetido → 400 (§3.9.5)
@ValidatorConstraint({ name: 'reportSections', async: false })
export class ReportSectionsValidator implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return reportSectionsError(value) === null;
  }

  defaultMessage({ value }: ValidationArguments): string {
    return reportSectionsError(value) ?? SECTIONS_MESSAGES.invalid;
  }
}
