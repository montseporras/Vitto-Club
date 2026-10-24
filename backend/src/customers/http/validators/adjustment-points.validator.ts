import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// §3.5.1: entero, > 0 y como máximo 1.000.000. Un solo validador para que cada caso dé un
// único mensaje (con varios decoradores, "" devolvería los tres mensajes juntos).
export const ADJUSTMENT_MAX_POINTS = 1_000_000;

export const ADJUSTMENT_POINTS_MESSAGES = {
  required: 'Ingresá la cantidad de puntos.',
  invalid: 'Tiene que ser un número entero mayor a 0.',
  // El contrato no cita texto para el máximo (decisión de Jazmín)
  max: 'Ingresá un número menor o igual a 1.000.000.',
} as const;

const isEmpty = (value: unknown): boolean => value === undefined || value === null || value === '';

function messageFor(value: unknown): string | null {
  if (isEmpty(value)) return ADJUSTMENT_POINTS_MESSAGES.required;
  // "10" como texto no vale: tiene que llegar como número JSON
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return ADJUSTMENT_POINTS_MESSAGES.invalid;
  }
  if (value > ADJUSTMENT_MAX_POINTS) return ADJUSTMENT_POINTS_MESSAGES.max;
  return null;
}

@ValidatorConstraint({ name: 'adjustmentPoints', async: false })
export class AdjustmentPointsValidator implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return messageFor(value) === null;
  }

  defaultMessage(args: ValidationArguments): string {
    return messageFor(args.value) ?? ADJUSTMENT_POINTS_MESSAGES.invalid;
  }
}
