import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  REDEMPTION_ORDERS,
  REDEMPTION_STATUS_GROUPS,
  type RedemptionOrder,
  type RedemptionStatusGroup,
} from '../../domain/redemption-filters.js';

// GET /customers/me/canjes (contrato S4 §3.12.1). El formato de las fechas y el rango invertido los
// valida el dominio, con los mismos mensajes que Movimientos de puntos. Los mensajes de acá siguen el
// estilo de ListAuditQueryDto (el contrato no los cita; decisión de Melisa).
export class ListMyRedemptionsQueryDto {
  // §2.6: CONFIRMED · FINISHED; sin valor = todos
  @IsOptional()
  @IsIn(REDEMPTION_STATUS_GROUPS, { message: 'status no es un estado válido' })
  status?: RedemptionStatusGroup;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @IsIn(REDEMPTION_ORDERS, { message: 'order debe ser desc o asc' })
  order?: RedemptionOrder;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page debe ser un entero' })
  @Min(1, { message: 'page debe ser mayor o igual a 1' })
  page: number = 1;

  // Por defecto 20; la pantalla usa 100 (§3.12.1)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit debe ser un entero' })
  @Min(1, { message: 'limit debe ser mayor o igual a 1' })
  @Max(100, { message: 'limit no puede superar 100' })
  limit: number = 20;
}
