import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { CONSUMPTION_STATUSES } from '../../domain/consumption.js';
import type { ConsumptionStatus } from '../../domain/consumption.js';

// GET /customers/me/consumos (§3.10.2): los mismos filtros que /customers/:id/consumos, sin
// last24h, que se rechaza como campo de más.
export class ListMyConsumptionsQueryDto {
  @IsOptional()
  @IsIn(CONSUMPTION_STATUSES)
  status?: ConsumptionStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
