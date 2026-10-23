import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import type { Level } from '../../../points/domain/level.js';

export class ListCustomersQueryDto {
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

  // Se omite para traer activos e inactivos
  @IsOptional()
  @IsIn(['true', 'false'])
  active?: 'true' | 'false';

  // Búsqueda por nombre y/o apellido (sin distinguir mayúsculas)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  // CLI-ADM: nombre, apellido o documento (normalizado), coincidencia parcial. No se puede
  // mandar junto con name (contrato §3.8.1; lo controla el servicio).
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  // CLI-ADM: nivel calculado
  @IsOptional()
  @IsIn(['BRONZE', 'SILVER', 'GOLD'])
  level?: Level;

  // CLI-ADM: 'id' por defecto, para no romper a quien ya usa el listado
  @IsOptional()
  @IsIn(['lastName', 'id'])
  sort?: 'lastName' | 'id';
}
