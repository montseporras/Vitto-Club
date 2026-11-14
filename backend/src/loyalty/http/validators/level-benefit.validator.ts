import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { benefitError, LEVEL_MESSAGES } from '../../domain/levels.js';

// Beneficio de un nivel (S5 §3.10): opcional, texto de hasta 255 caracteres. Ausente o null = sin
// beneficio (o el vigente, según el endpoint); el espacio de los bordes no cuenta.
@ValidatorConstraint({ name: 'levelBenefit', async: false })
export class LevelBenefitValidator implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return benefitError(value) === null;
  }

  defaultMessage(args?: ValidationArguments): string {
    return benefitError(args?.value) ?? LEVEL_MESSAGES.benefitTooLong;
  }
}
