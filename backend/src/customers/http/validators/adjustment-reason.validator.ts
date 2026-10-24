import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// §3.5.1: obligatorio, de 1 a 500 caracteres (ya recortado). Un solo validador para que cada
// caso dé un único mensaje, como la cantidad.
export const ADJUSTMENT_REASON_MAX_LENGTH = 500;

export const ADJUSTMENT_REASON_MESSAGES = {
  required: 'El motivo es obligatorio.',
  // El contrato no cita texto para el máximo (decisión de Jazmín)
  tooLong: 'El motivo no puede superar los 500 caracteres.',
} as const;

function messageFor(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return ADJUSTMENT_REASON_MESSAGES.required;
  if (value.length > ADJUSTMENT_REASON_MAX_LENGTH) return ADJUSTMENT_REASON_MESSAGES.tooLong;
  return null;
}

@ValidatorConstraint({ name: 'adjustmentReason', async: false })
export class AdjustmentReasonValidator implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return messageFor(value) === null;
  }

  defaultMessage(args: ValidationArguments): string {
    return messageFor(args.value) ?? ADJUSTMENT_REASON_MESSAGES.required;
  }
}
