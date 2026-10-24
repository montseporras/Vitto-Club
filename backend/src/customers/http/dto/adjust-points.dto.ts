import { Transform } from 'class-transformer';
import { IsIn, Validate } from 'class-validator';
import { AdjustmentPointsValidator } from '../validators/adjustment-points.validator.js';
import { AdjustmentReasonValidator } from '../validators/adjustment-reason.validator.js';

export const ADJUSTMENT_DIRECTIONS = ['ADD', 'SUBTRACT'] as const;
export type AdjustmentDirection = (typeof ADJUSTMENT_DIRECTIONS)[number];

// §3.5.1 (US-24). Quién ajusta y la fecha los pone el servidor: no van en el body.
export class AdjustPointsDto {
  // El contrato no cita texto para este caso (decisión de Jazmín)
  @IsIn(ADJUSTMENT_DIRECTIONS, { message: 'Elegí si querés sumar o restar puntos.' })
  direction!: AdjustmentDirection;

  @Validate(AdjustmentPointsValidator)
  points!: number;

  // Sin espacios en los extremos: se recorta antes de validar, así "   " cuenta como vacío
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Validate(AdjustmentReasonValidator)
  reason!: string;
}
