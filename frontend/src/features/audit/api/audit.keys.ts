import type { AuditQueryParams } from '../types/audit'

export const auditKeys = {
  all: ['audit'] as const,
  actors: () => [...auditKeys.all, 'actors'] as const,
  entries: (params: AuditQueryParams) =>
    [...auditKeys.all, 'entries', params] as const,
}
