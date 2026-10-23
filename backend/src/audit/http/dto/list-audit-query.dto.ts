import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { DOCUMENT_TYPES } from '../../../customers/domain/customer.js';
import type { DocumentType } from '../../../customers/domain/customer.js';
import { AUDIT_ACTIONS_BY_MODULE } from '../../domain/audit-entry.js';
import type { AuditAction, AuditModule } from '../../domain/audit-entry.js';

const AUDIT_MODULES = Object.keys(AUDIT_ACTIONS_BY_MODULE) as AuditModule[];
const AUDIT_ACTIONS = Object.values(AUDIT_ACTIONS_BY_MODULE).flat() as AuditAction[];

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MESSAGE = 'debe tener el formato YYYY-MM-DD';

// Query de GET /auditoria (contrato §3.9.4). El ValidationPipe global rechaza con 400 los
// parámetros que no estén acá. Las reglas que cruzan campos (action ↔ module, rangos) viven en
// el dominio: ver buildAuditFilters.
export class ListAuditQueryDto {
  // SYSTEM o el id de una cuenta de empleado
  @IsOptional()
  @Matches(/^(SYSTEM|\d+)$/, { message: 'actor debe ser SYSTEM o el id de una cuenta de empleado' })
  actor?: string;

  @IsOptional()
  @IsIn(AUDIT_MODULES, { message: 'module no es un módulo válido' })
  module?: AuditModule;

  @IsOptional()
  @IsIn(AUDIT_ACTIONS, { message: 'action no es una acción válida' })
  action?: AuditAction;

  @IsOptional()
  @IsIn(DOCUMENT_TYPES, { message: 'documentType debe ser DNI o PASSPORT' })
  documentType?: DocumentType;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'documentNumber no puede superar los 20 caracteres' })
  documentNumber?: string;

  @IsOptional()
  @Matches(DAY, { message: `fromDate ${DAY_MESSAGE}` })
  fromDate?: string;

  @IsOptional()
  @Matches(DAY, { message: `toDate ${DAY_MESSAGE}` })
  toDate?: string;

  @IsOptional()
  @Matches(DAY, { message: `date ${DAY_MESSAGE}` })
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'operationCode no puede superar los 20 caracteres' })
  operationCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page debe ser un entero' })
  @Min(1, { message: 'page debe ser mayor o igual a 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit debe ser un entero' })
  @Min(1, { message: 'limit debe ser mayor o igual a 1' })
  @Max(100, { message: 'limit no puede superar 100' })
  limit: number = 20;
}
