import {
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { DOCUMENT_TYPES } from '../../domain/customer';
import type { DocumentType } from '../../domain/customer';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName!: string;

  @IsIn(DOCUMENT_TYPES)
  documentType!: DocumentType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  documentNumber!: string;

  @IsNotEmpty()
  @IsEmail()
  @MaxLength(150)
  email!: string;

  // Opcional: IsOptional también acepta null (para borrar el teléfono en un PATCH)
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  // Formato YYYY-MM-DD
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string | null;
}
