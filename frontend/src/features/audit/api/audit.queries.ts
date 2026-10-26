import { useQuery } from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import { listAuditActors, listAuditEntries } from './audit.api'
import { auditKeys } from './audit.keys'
import type { AuditQueryParams, AuditResponse, AuditActor } from '../types/audit'

export const useAuditEntries = (params: AuditQueryParams) =>
  useQuery<AuditResponse, ApiError>({
    queryKey: auditKeys.entries(params),
    queryFn: () => listAuditEntries(params),
    retry: (count, error) => error.status === undefined && count < 1,
  })

export const useAuditActors = () =>
  useQuery<AuditActor[], ApiError>({
    queryKey: auditKeys.actors(),
    queryFn: listAuditActors,
    retry: (count, error) => error.status === undefined && count < 1,
  })
