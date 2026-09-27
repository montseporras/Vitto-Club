import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { DOCUMENT_TYPES } from '../../domain/customer.js';
import type { DocumentType } from '../../domain/customer.js';

export class FindCustomerByDocumentQueryDto {
  // Si no se envía, se asume DNI
  @IsOptional()
  @IsIn(DOCUMENT_TYPES)
  documentType: DocumentType = 'DNI';

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  documentNumber!: string;
}
