import {
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// Tipos de documento aceptados. Es una copia a propósito de los de customers: accounts no
// importa el dominio de otro módulo (ver docs/ARCHITECTURE.md). Si no coincidieran,
// customers igual rechaza el dato al crear el cliente.
const DOCUMENT_TYPES = ['DNI', 'PASSPORT'] as const;

// SCRUM-160. Los datos de RF-015 (mismas reglas que CreateCustomerDto) más la contraseña.
// La validación del body la hace el ValidationPipe global de main.ts (whitelist +
// forbidNonWhitelisted): cualquier campo no declarado acá se rechaza con 400.
export class RegisterCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName!: string;

  @IsIn(DOCUMENT_TYPES)
  documentType!: (typeof DOCUMENT_TYPES)[number];

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  documentNumber!: string;

  @IsNotEmpty()
  @IsEmail()
  @MaxLength(150)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  // Formato YYYY-MM-DD
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string | null;

  // El largo en bytes y que sea distinta del email los valida AccountsService (Password)
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password!: string;
}
