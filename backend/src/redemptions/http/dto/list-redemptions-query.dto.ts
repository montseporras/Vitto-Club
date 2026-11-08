import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { DOCUMENT_TYPES, type DocumentType } from '../../../customers/domain/customer.js';
import { REDEMPTION_STATUSES, type RedemptionStatus } from '../../domain/redemption.js';
import { REDEMPTION_ORDERS, type RedemptionOrder } from '../../domain/redemption-filters.js';

// GET /canjes (contrato S4 §3.12.3). El formato de las fechas y el rango invertido los valida el
// dominio, con los mismos mensajes que Movimientos de puntos. Los mensajes de acá siguen el estilo
// de ListAuditQueryDto (el contrato no los cita; decisión de Melisa).
export class ListRedemptionsQueryDto {
  // DNI por defecto; solo se aplica si viene documentNumber
  @IsOptional()
  @IsIn(DOCUMENT_TYPES, { message: 'documentType debe ser DNI o PASSPORT' })
  documentType?: DocumentType;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'documentNumber no puede superar los 20 caracteres' })
  documentNumber?: string;

  // El máximo se controla antes de normalizar (decisión de Melisa)
  @IsOptional()
  @IsString()
  @MaxLength(10, { message: 'code no puede superar los 10 caracteres' })
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80, { message: 'rewardName no puede superar los 80 caracteres' })
  rewardName?: string;

  @IsOptional()
  @IsIn(REDEMPTION_STATUSES, { message: 'status no es un estado válido' })
  status?: RedemptionStatus;

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

  // Por defecto 20 (decisión de Melisa); la pantalla usa 10
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit debe ser un entero' })
  @Min(1, { message: 'limit debe ser mayor o igual a 1' })
  @Max(100, { message: 'limit no puede superar 100' })
  limit: number = 20;
}
