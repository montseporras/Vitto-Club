import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { EMPLOYEE_ROLES } from '../../../employees/domain/employee.js';
import type { EmployeeRole } from '../../../employees/domain/employee.js';

// US-06. Body completo: cambiar rol, resetear password, o ambos. El email no está acá
// (no se edita desde este ABMC); si se envía, el ValidationPipe global (forbidNonWhitelisted)
// responde 400, igual que con username/identifier/passwordHash/cualquier campo interno.
// "Al menos uno de los dos debe venir" se valida en el controller, no acá: no hay
// precedente en el proyecto de un validador de DTO para reglas entre campos (ver
// CustomersService.update(), que hace ese mismo tipo de chequeo a nivel de aplicación).
export class UpdateAccountDto {
  @IsOptional()
  @IsIn(EMPLOYEE_ROLES)
  role?: EmployeeRole;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password?: string;
}
