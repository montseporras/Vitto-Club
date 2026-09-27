import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

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
}
