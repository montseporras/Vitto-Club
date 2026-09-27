import {
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { DOCUMENT_TYPES } from '../../domain/customer.js';
import type { DocumentType } from '../../domain/customer.js';

// Solo se validan los campos que vienen en el body. PartialType usaría IsOptional, que también deja
// pasar `null`; acá `null` en un campo obligatorio se rechaza con 400.
const isProvided = (_object: unknown, value: unknown) => value !== undefined;

export class UpdateCustomerDto {
  @ValidateIf(isProvided)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName?: string;

  @ValidateIf(isProvided)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName?: string;

  @ValidateIf(isProvided)
  @IsIn(DOCUMENT_TYPES)
  documentType?: DocumentType;

  @ValidateIf(isProvided)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  documentNumber?: string;

  @ValidateIf(isProvided)
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  // Opcionales: se pueden borrar enviando null
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  // Formato YYYY-MM-DD
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string | null;
}
