import { IsEmail, IsInt, IsNotEmpty, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';

// US-05. La validación del body la hace el ValidationPipe global de main.ts
// (whitelist + forbidNonWhitelisted): cualquier campo no declarado acá (ej. identifier,
// passwordHash, role) se rechaza solo con 400, sin que este DTO tenga que prohibirlo.
export class RegisterAccountDto {
  @IsInt()
  @IsPositive()
  employeeId!: number;

  // Debe coincidir con Employee.email; esa validación de negocio vive en AccountsService.
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(150)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password!: string;
}
