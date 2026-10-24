import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CONSUMPTION_STATUSES } from '../../domain/consumption.js';
import type { ConsumptionStatus } from '../../domain/consumption.js';

// GET /consumos (§3.3.1). El formato de las fechas y el rango invertido los valida el
// dominio, con los mismos mensajes que Movimientos de puntos.
export class ListConsumptionsQueryDto {
  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @IsIn(CONSUMPTION_STATUSES)
  status?: ConsumptionStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  registeredByAccountId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  customerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  // Por defecto 20; la pantalla usa 8 (lo decide quien llama)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
