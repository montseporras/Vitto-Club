import type { AuditDetail, AuditAction, AuditModule } from '../../domain/audit-entry.js';
import type { AuditActorOption } from '../../domain/audit-filters.js';
import type { AuditPage, AuditRecord } from '../../domain/audit-record.js';

// Respuestas de la consulta de auditoría, con la forma exacta del contrato (§3.9.4 y §3.9.5)
export class AuditEntryResponseDto {
  id!: number;
  createdAt!: string;
  actorType!: 'EMPLOYEE' | 'SYSTEM';
  actorAccountId!: number | null;
  performedBy!: string;
  module!: AuditModule;
  action!: AuditAction;
  description!: string;
  affectedCustomer!: AuditRecord['affectedCustomer'];
  operationCode!: string | null;
  details!: AuditDetail[];

  static fromRecord(record: AuditRecord): AuditEntryResponseDto {
    const dto = new AuditEntryResponseDto();
    dto.id = record.id;
    dto.createdAt = record.createdAt.toISOString();
    dto.actorType = record.actorType;
    dto.actorAccountId = record.actorAccountId;
    dto.performedBy = record.performedBy;
    dto.module = record.module;
    dto.action = record.action;
    dto.description = record.description;
    dto.affectedCustomer = record.affectedCustomer;
    dto.operationCode = record.operationCode;
    dto.details = record.details;
    return dto;
  }
}

export class AuditPageResponseDto {
  items!: AuditEntryResponseDto[];
  total!: number;
  page!: number;
  limit!: number;

  static from(page: AuditPage, pageNumber: number, limit: number): AuditPageResponseDto {
    const dto = new AuditPageResponseDto();
    dto.items = page.items.map((record) => AuditEntryResponseDto.fromRecord(record));
    dto.total = page.total;
    dto.page = pageNumber;
    dto.limit = limit;
    return dto;
  }
}

export class AuditActorResponseDto {
  accountId!: number;
  name!: string;
  role!: 'ADMIN' | 'CASHIER';
  active!: boolean;

  static from(actor: AuditActorOption): AuditActorResponseDto {
    const dto = new AuditActorResponseDto();
    dto.accountId = actor.accountId;
    dto.name = actor.name;
    dto.role = actor.role;
    dto.active = actor.active;
    return dto;
  }
}
