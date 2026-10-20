import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { CONSUMPTION_STATUSES } from '../../domain/consumption.js';
import type { ConsumptionStatus } from '../../domain/consumption.js';

// §3.2.1. last24h llega como string de query ('true'/'false'); el service decide el valor
// efectivo según el rol (el Cajero lo fuerza a true sin importar lo que llegue acá).
export class ListCustomerConsumptionsQueryDto {
  @IsOptional()
  @IsIn(['true', 'false'])
  last24h?: 'true' | 'false';

  @IsOptional()
  @IsIn(CONSUMPTION_STATUSES)
  status?: ConsumptionStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  // Por defecto 20; la ficha del cliente usa 5 (lo decide quien llame al endpoint).
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
