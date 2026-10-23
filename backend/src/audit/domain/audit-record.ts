import type { DocumentType } from '../../customers/domain/customer.js';
import type { AuditAction, AuditDetail, AuditModule } from './audit-entry.js';

// Una fila del historial tal como se lee de la base (contrato §3.9.4, tipo `AuditEntry`).
export type AuditRecord = {
  id: number;
  createdAt: Date;
  actorType: 'EMPLOYEE' | 'SYSTEM';
  actorAccountId: number | null;
  performedBy: string;
  module: AuditModule;
  action: AuditAction;
  description: string;
  affectedCustomer: {
    customerId: number;
    name: string;
    documentType: DocumentType;
    documentNumber: string;
  } | null;
  operationCode: string | null;
  details: AuditDetail[];
};

export type AuditPage = { items: AuditRecord[]; total: number };
