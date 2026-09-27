import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { EMPLOYEE_ROLES } from '../../domain/employee.js';
import type { EmployeeRole } from '../../domain/employee.js';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName!: string;

  @IsNotEmpty()
  @IsEmail()
  @MaxLength(150)
  email!: string;

  @IsIn(EMPLOYEE_ROLES)
  role!: EmployeeRole;

  // Opcional (contrato del frontend, RF-01). El formato lo valida el dominio.
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;
}
