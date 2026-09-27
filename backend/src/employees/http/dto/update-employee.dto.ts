import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { EMPLOYEE_ROLES } from '../../domain/employee.js';
import type { EmployeeRole } from '../../domain/employee.js';

// Body completo del formulario de edición (RF-02). El email no está: si se envía,
// el ValidationPipe global (forbidNonWhitelisted) responde 400.
export class UpdateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName!: string;

  @IsIn(EMPLOYEE_ROLES)
  role!: EmployeeRole;

  // Ausente o null = el empleado queda sin teléfono. El formato lo valida el dominio.
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;
}
