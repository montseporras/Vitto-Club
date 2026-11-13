import { Transform } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';
import { PROMOTION_LEVELS, type PromotionLevel } from '../../domain/notification.js';
import { PROMOTION_LEVEL_INVALID } from '../../domain/promotions.js';

// GET /promociones/destinatarios (contrato S5 §3.7.2): `?level=BRONZE|SILVER|GOLD`; sin valor = todos los clientes
// activos. Un nivel inválido es un 400.
export class PromotionRecipientsQueryDto {
  // `?level=` vacío cuenta como "sin valor", no como un nivel inválido
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsIn(PROMOTION_LEVELS, { message: PROMOTION_LEVEL_INVALID })
  level?: PromotionLevel;
}
