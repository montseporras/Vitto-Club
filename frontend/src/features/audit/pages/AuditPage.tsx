import { useMemo, useState } from 'react'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert } from '@/shared/components/ui/Alert'
import { Page, PageCard } from '@/shared/components/ui/Page'
import { addDaysToIso, todayIsoInTimeZone } from '@/shared/lib/dates'
import { useAuditActors, useAuditEntries } from '../api/audit.queries'
import { AuditFilters } from '../components/AuditFilters'
import type { AuditFiltersState } from '../components/AuditFilters'
import { AuditTable } from '../components/AuditTable'
import type { AuditQueryParams } from '../types/audit'

const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires'

const DEFAULT_FILTERS: AuditFiltersState = {
  actor: '',
  module: '',
  action: '',
  documentType: 'DNI',
  documentNumber: '',
  datePreset: 'ANY',
  fromDate: '',
  toDate: '',
}

function dateRange(filters: AuditFiltersState) {
  const today = todayIsoInTimeZone(ARGENTINA_TIME_ZONE)
  switch (filters.datePreset) {
    case 'TODAY':
      return { fromDate: today, toDate: today }
    case 'LAST_7_DAYS':
      return { fromDate: addDaysToIso(today, -6), toDate: today }
    case 'THIS_MONTH':
      return { fromDate: `${today.slice(0, 7)}-01`, toDate: today }
    case 'CUSTOM':
      return {
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
      }
    default:
      return {}
  }
}

function queryParams(filters: AuditFiltersState, page: number): AuditQueryParams {
  const documentNumber = filters.documentNumber.trim()
  const range = dateRange(filters)
  return {
    ...(filters.actor === 'SYSTEM'
      ? { actor: 'SYSTEM' as const }
      : filters.actor
        ? { actor: Number(filters.actor) }
        : {}),
    ...(filters.module ? { module: filters.module } : {}),
    ...(filters.action ? { action: filters.action } : {}),
    ...(documentNumber
      ? { documentType: filters.documentType, documentNumber }
      : {}),
    ...range,
    page,
    limit: 10,
  }
}

export function AuditPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const params = useMemo(() => queryParams(filters, page), [filters, page])
  const entries = useAuditEntries(params)
  const actors = useAuditActors()

  const changeFilters = (change: Partial<AuditFiltersState>) => {
    setFilters((current) => ({ ...current, ...change }))
    setPage(1)
    setExpandedId(null)
  }

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setPage(1)
    setExpandedId(null)
  }

  return (
    <Page className="items-start">
      <PageCard eyebrow="Administración" title="Auditoría" variant="plain" className="w-full">
        <div className="space-y-5">
          {actors.isError && (
            <Alert>
              <p>{actors.error.message}</p>
              {actors.error.details.map((detail, index) => (
                <p key={`${detail.field}-${index}`}>
                  {detail.field}: {detail.message}
                </p>
              ))}
            </Alert>
          )}

          <AuditFilters
            filters={filters}
            actors={actors.data ?? []}
            actorsLoading={actors.isLoading}
            onChange={changeFilters}
            onClear={clearFilters}
          />

          {entries.isPending ? (
            <StatusText role="status" aria-live="polite">
              Cargando…
            </StatusText>
          ) : entries.isError ? (
            <Alert>
              <p>{entries.error.message}</p>
              {entries.error.details.map((detail, index) => (
                <p key={`${detail.field}-${index}`}>
                  {detail.field}: {detail.message}
                </p>
              ))}
            </Alert>
          ) : (
            <AuditTable
              result={entries.data}
              expandedId={expandedId}
              onToggle={(entry) =>
                setExpandedId((current) =>
                  current === entry.id ? null : entry.id,
                )
              }
              onPageChange={(nextPage) => {
                setPage(nextPage)
                setExpandedId(null)
              }}
            />
          )}
        </div>
      </PageCard>
    </Page>
  )
}
