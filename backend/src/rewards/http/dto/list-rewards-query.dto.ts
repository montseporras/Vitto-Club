import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { LISTABLE_REWARD_STATUSES } from '../../domain/port/reward.repository.js';
import type { ListableRewardStatus } from '../../domain/port/reward.repository.js';

// GET /recompensas (§3.2.1). Sin status = todas menos DELETED; status=DELETED → 400. Mensajes por
// defecto de class-validator, como GET /consumos (decisión de Jazmín: el contrato no los cita).
export class ListRewardsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @IsIn(LISTABLE_REWARD_STATUSES)
  status?: ListableRewardStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  // Por defecto 20; la pantalla usa 10 (lo decide quien llama)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
