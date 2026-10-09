import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { DOCUMENT_TYPES } from '../../customers/domain/customer.js';
import {
  AuditCategory,
  type AuditCategory as AuditCategoryType,
} from '../domain/audit.repository.js';

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

export class AuditQueryDto {
  @IsOptional()
  @IsString()
  performedBy?: string;

  @IsOptional()
  @IsIn(Object.values(AuditCategory))
  category?: AuditCategoryType;

  @IsOptional()
  @IsIn(DOCUMENT_TYPES)
  documentType?: (typeof DOCUMENT_TYPES)[number];

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsDateString()
  @Matches(DATE_FORMAT)
  date?: string;

  @IsOptional()
  @IsDateString()
  @Matches(DATE_FORMAT)
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  @Matches(DATE_FORMAT)
  toDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
