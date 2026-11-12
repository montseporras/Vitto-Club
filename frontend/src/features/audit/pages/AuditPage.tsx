import { useMemo, useRef, useState } from 'react'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert } from '@/shared/components/ui/Alert'
import { AdminPanel } from '@/shared/components/ui/AdminPanel'
import { Page } from '@/shared/components/ui/Page'
import { RangePagination } from '@/shared/components/ui/Pagination'
import { useClampPage, useRowsThatFit } from '@/shared/hooks/useRowsThatFit'
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

function queryParams(
  filters: AuditFiltersState,
  page: number,
  limit: number,
): AuditQueryParams {
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
    limit,
  }
}

export function AuditPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  // Filas por página: las que entran en la pantalla (ajustes S5-57)
  const areaRef = useRef<HTMLDivElement>(null)
  const pagerRef = useRef<HTMLElement>(null)
  const limit = useRowsThatFit({ areaRef, pagerRef, initial: 10 })
  const params = useMemo(() => queryParams(filters, page, limit), [filters, page, limit])
  const entries = useAuditEntries(params)
  useClampPage(page, setPage, entries.data?.total, entries.data?.limit)
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
    <Page className="max-w-none">
      <AdminPanel title="Auditoría">
        {actors.isError && (
          <Alert className="mb-5">
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

        <div ref={areaRef} className="mt-3.5">
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
            />
          )}
        </div>

        {entries.data && !entries.isError && entries.data.items.length > 0 && (
          <RangePagination
            ref={pagerRef}
            page={entries.data.page}
            total={entries.data.total}
            pageSize={entries.data.limit}
            className="pt-3.5"
            disabled={entries.isFetching}
            onChange={(nextPage) => {
              setPage(nextPage)
              setExpandedId(null)
            }}
          />
        )}
      </AdminPanel>
    </Page>
  )
}
