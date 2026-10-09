import type { Prisma } from '@prisma/client';
import type { DocumentType } from '../../customers/domain/customer.js';

export const AuditCategory = {
  SESSION: 'SESSION',
  CUSTOMERS: 'CUSTOMERS',
  EMPLOYEES: 'EMPLOYEES',
  CONFIGURATION: 'CONFIGURATION',
} as const;

export type AuditCategory =
  (typeof AuditCategory)[keyof typeof AuditCategory];

export type RecordAuditEntry = {
  actorAccountId?: number;
  performedBy?: string;
  category: AuditCategory;
  action: string;
  documentType?: DocumentType;
  documentNumber?: string;
  details?: Prisma.InputJsonValue;
};

export type AuditFilters = {
  performedBy?: string;
  category?: AuditCategory;
  documentType?: DocumentType;
  documentNumber?: string;
  date?: string;
  fromDate?: string;
  toDate?: string;
  page: number;
  limit: number;
};

export type AuditEntry = {
  id: number;
  createdAt: Date;
  performedBy: string;
  actorAccountId: number | null;
  category: AuditCategory;
  action: string;
  documentType: DocumentType | null;
  documentNumber: string | null;
  details: Prisma.JsonValue | null;
};

export type AuditPage = {
  items: AuditEntry[];
  total: number;
};

export abstract class AuditRepository {
  abstract record(entry: RecordAuditEntry): Promise<void>;
  abstract find(filters: AuditFilters): Promise<AuditPage>;
}
