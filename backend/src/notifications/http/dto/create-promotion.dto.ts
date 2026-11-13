import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import {
  BODY_REQUIRED,
  BODY_TOO_LONG,
  MAX_BODY_LENGTH,
  MAX_SUBJECT_LENGTH,
  SUBJECT_REQUIRED,
  SUBJECT_TOO_LONG,
} from '../../domain/notification-messages.js';
import { PROMOTION_LEVELS, type PromotionLevel } from '../../domain/notification.js';
import { PROMOTION_LEVEL_INVALID, SCHEDULED_AT_INVALID } from '../../domain/promotions.js';

// POST /promociones/envios (contrato S5 §3.7.3): `{ subject, body, level, scheduledAt }`. Los mensajes son los del
// contrato. Un asunto o mensaje solo con espacios cuenta como vacío. Que `scheduledAt` sea una fecha y hora válidas y
// futuras, y que el texto solo use {nombre}, lo valida el dominio (con el campo en `details`).
export class CreatePromotionDto {
  @IsString({ message: SUBJECT_REQUIRED })
  @Matches(/\S/, { message: SUBJECT_REQUIRED })
  @MaxLength(MAX_SUBJECT_LENGTH, { message: SUBJECT_TOO_LONG })
  subject!: string;

  @IsString({ message: BODY_REQUIRED })
  @Matches(/\S/, { message: BODY_REQUIRED })
  @MaxLength(MAX_BODY_LENGTH, { message: BODY_TOO_LONG })
  body!: string;

  // Sin valor o null = todos los clientes activos
  @IsOptional()
  @IsIn(PROMOTION_LEVELS, { message: PROMOTION_LEVEL_INVALID })
  level?: PromotionLevel | null;

  // Sin valor o null = se envía ahora
  @IsOptional()
  @IsString({ message: SCHEDULED_AT_INVALID })
  scheduledAt?: string | null;
}
