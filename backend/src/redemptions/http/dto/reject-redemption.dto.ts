import { Transform } from 'class-transformer';
import { Validate } from 'class-validator';
import { RejectionReasonValidator } from '../validators/rejection-reason.validator.js';

// Contrato S4 §3.10.1. Quién rechaza y cuándo los pone el servidor: no van en el body.
export class RejectRedemptionDto {
  // Se recorta antes de validar, así "   " cuenta como vacío
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Validate(RejectionReasonValidator)
  reason!: string;
}
