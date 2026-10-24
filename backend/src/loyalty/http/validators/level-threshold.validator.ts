import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { LEVEL_MESSAGES, thresholdFormatError } from '../../domain/levels.js';

type LevelsRequest = {
  silverMinPoints?: unknown;
  goldMinPoints?: unknown;
};

// Un solo mensaje por campo, el primero que corresponda (§3.7.2): con varios decoradores de
// class-validator, un campo vacío devolvería a la vez "Completá…", "Ingresá…" y el del mínimo.
// El constraint recibe qué umbral valida: 'silver' o 'gold'.
function errorFor(args: ValidationArguments): string | null {
  const [threshold] = args.constraints as ['silver' | 'gold'];
  const formatError = thresholdFormatError(args.value);
  if (formatError) return formatError;

  const value = args.value as number;
  if (threshold === 'silver') {
    return value <= 0 ? LEVEL_MESSAGES.silverNotPositive : null;
  }
  // Oro contra Plata solo si Plata llegó bien; si Plata no vino, lo compara el dominio contra la
  // versión vigente (guardado completo, donde los dos son opcionales).
  const silver = (args.object as LevelsRequest).silverMinPoints;
  if (thresholdFormatError(silver) === null && value <= (silver as number)) {
    return LEVEL_MESSAGES.goldNotAboveSilver;
  }
  return null;
}

@ValidatorConstraint({ name: 'levelThreshold', async: false })
export class LevelThresholdValidator implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    return errorFor(args) === null;
  }

  defaultMessage(args: ValidationArguments): string {
    return errorFor(args) ?? LEVEL_MESSAGES.notInteger;
  }
}
