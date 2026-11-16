import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { MISSION_PHASES, type MissionPhase } from '../../domain/mission.js';
import { MISSION_ORDERS, type MissionOrder } from '../../domain/port/mission.repository.js';

// GET /misiones (§3.1.2). Sin phase = todas las no dadas de baja. Mensajes por defecto de
// class-validator, como GET /recompensas (decisión de Jazmín: el contrato no los cita).
export class ListMissionsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @IsIn(MISSION_PHASES)
  phase?: MissionPhase;

  // S5-45: otro valor → 400
  @IsOptional()
  @IsIn(MISSION_ORDERS)
  order: MissionOrder = 'RECENT';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  // §3.1.2: por defecto 10, máximo 100. La pantalla manda las filas que entran (S5-57)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;
}
