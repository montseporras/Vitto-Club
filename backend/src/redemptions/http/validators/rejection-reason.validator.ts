import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// Contrato S4 §3.10.1 (CA-43.2): obligatorio, de 5 a 500 caracteres (ya recortado). Un solo
// validador para que cada caso dé un único mensaje, como el motivo del ajuste de puntos.
export const REJECTION_REASON_MIN_LENGTH = 5;
export const REJECTION_REASON_MAX_LENGTH = 500;

export const REJECTION_REASON_MESSAGES = {
  required: 'El motivo es obligatorio.',
  tooShort: 'Indicá un motivo de al menos 5 caracteres.',
  tooLong: 'El motivo no puede superar los 500 caracteres.',
} as const;

function messageFor(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return REJECTION_REASON_MESSAGES.required;
  if (value.length < REJECTION_REASON_MIN_LENGTH) return REJECTION_REASON_MESSAGES.tooShort;
  if (value.length > REJECTION_REASON_MAX_LENGTH) return REJECTION_REASON_MESSAGES.tooLong;
  return null;
}

@ValidatorConstraint({ name: 'rejectionReason', async: false })
export class RejectionReasonValidator implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return messageFor(value) === null;
  }

  defaultMessage(args: ValidationArguments): string {
    return messageFor(args.value) ?? REJECTION_REASON_MESSAGES.required;
  }
}
