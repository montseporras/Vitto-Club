import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { POINTS_MOVEMENT_TYPES } from '../../domain/points-movement.js';
import type { PointsMovementType } from '../../domain/points-movement.js';

// Paginación y tipo: comunes a los tres listados (§3.6.1, §3.6.2, §3.10.2)
class MovementsPageQueryDto {
  @IsOptional()
  @IsIn(POINTS_MOVEMENT_TYPES)
  type?: PointsMovementType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  // Por defecto 20; la ficha usa 5 y la sección del Administrador, 10 (lo decide quien llama)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

// GET /customers/me/movimientos (§3.10.2): sin last24h, que se rechaza como campo de más
export class ListMyMovementsQueryDto extends MovementsPageQueryDto {}

// GET /customers/:id/movimientos (§3.6.1). last24h llega como string; el service decide el
// valor efectivo según el rol (el Cajero lo fuerza a true).
export class ListCustomerMovementsQueryDto extends MovementsPageQueryDto {
  @IsOptional()
  @IsIn(['true', 'false'])
  last24h?: 'true' | 'false';
}

// GET /movimientos-de-puntos (§3.6.2). El formato de las fechas lo valida el dominio.
export class ListPointsMovementsQueryDto extends MovementsPageQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  customerId?: number;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;
}
