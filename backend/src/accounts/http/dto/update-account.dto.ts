import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ACCOUNT_ROLES } from '../../domain/account-role.js';
import type { AccountRole } from '../../domain/account-role.js';

// US-06. Body completo: cambiar rol, resetear password, o ambos. El email no está acá
// (no se edita desde este ABMC); si se envía, el ValidationPipe global (forbidNonWhitelisted)
// responde 400, igual que con username/identifier/passwordHash/cualquier campo interno.
// "Al menos uno de los dos debe venir" se valida en el controller, no acá: no hay
// precedente en el proyecto de un validador de DTO para reglas entre campos (ver
// CustomersService.update(), que hace ese mismo tipo de chequeo a nivel de aplicación).
export class UpdateAccountDto {
  @IsOptional()
  @IsIn(ACCOUNT_ROLES)
  role?: AccountRole;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password?: string;
}
