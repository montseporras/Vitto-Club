import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

// Sin paginación: GET /api/empleados siempre devuelve un array (contrato del frontend)
export class ListEmployeesQueryDto {
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
