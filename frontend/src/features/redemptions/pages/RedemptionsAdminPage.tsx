// Pantalla Canjes del Administrador (US-45, contrato §3.12.3 y prototipo GestionCanjes): filtros
// que se aplican con "Filtrar", tabla paginada de a 10 y modal con el detalle de cada canje.
import { useState } from 'react'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Page, PageCard } from '@/shared/components/ui/Page'
import { useRedemptions } from '../api/redemptions.queries'
import { AdminRedemptionFilters } from '../components/AdminRedemptionFilters'
import { AdminRedemptionsTable } from '../components/AdminRedemptionsTable'
import { RedemptionDetailModal } from '../components/RedemptionDetailModal'
import { emptyDraftFilters, type DraftRedemptionFilters } from '../lib/draft-filters'
import { useExpiryRefetch } from '../lib/use-expiry-refetch'
import type { RedemptionFilters } from '../types/redemption'

// Del formulario a los parámetros de GET /canjes. Un día elegido filtra ese día (fromDate = toDate).
function toFilters(draft: DraftRedemptionFilters): RedemptionFilters {
  const documentNumber = draft.documentNumber.trim()
  const code = draft.code.trim()
  const rewardName = draft.rewardName.trim()
  return {
    ...(documentNumber ? { documentType: draft.documentType, documentNumber } : {}),
    ...(code ? { code } : {}),
    ...(rewardName ? { rewardName } : {}),
    ...(draft.status ? { status: draft.status } : {}),
    ...(draft.fromDate ? { fromDate: draft.fromDate, toDate: draft.toDate || draft.fromDate } : {}),
    order: draft.order,
  }
}

export function RedemptionsAdminPage() {
  const [draft, setDraft] = useState<DraftRedemptionFilters>(emptyDraftFilters)
  const [applied, setApplied] = useState<DraftRedemptionFilters>(emptyDraftFilters)
  const [filters, setFilters] = useState<RedemptionFilters>(toFilters(emptyDraftFilters))
  const [page, setPage] = useState(1)
  // Código del canje abierto en el modal; se busca en la lista para que se refresque con ella
  const [openCode, setOpenCode] = useState<string | null>(null)
  const result = useRedemptions(filters, page)
  const now = useExpiryRefetch(result.data?.items, result.refetch)

  const hasPending = JSON.stringify(draft) !== JSON.stringify(applied)
  const data = result.data
  const opened = data?.items.find((item) => item.code === openCode)
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1
  const start = data?.total ? (page - 1) * data.limit + 1 : 0
  const end = data ? Math.min(page * data.limit, data.total) : 0

  const applyFilters = () => {
    setFilters(toFilters(draft))
    setApplied(draft)
    setPage(1)
  }

  // Aplicar (US-42) y Rechazar (US-43): el modal se cierra y acá se abren sus ventanas cuando
  // esas historias estén hechas.
  const closeForAction = () => setOpenCode(null)

  return (
    <Page className="max-w-6xl">
      <PageCard
        eyebrow="Administración"
        title="Canjes"
        description="Hacé clic en un canje para ver el detalle y aplicarlo o rechazarlo."
        variant="plain"
      >
        <AdminRedemptionFilters
          draft={draft}
          onChange={setDraft}
          hasPending={hasPending}
          busy={result.isFetching}
          onSubmit={applyFilters}
        />

        {result.isLoading && <StatusText className="mt-6">Cargando canjes…</StatusText>}

        {result.isError && (
          <Alert variant="error" className="mt-6">
            <AlertMessages messages={result.error.messages} />
          </Alert>
        )}

        {data && !result.isError && data.items.length > 0 && (
          <>
            <AdminRedemptionsTable
              items={data.items}
              now={now}
              onOpen={(redemption) => setOpenCode(redemption.code)}
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <StatusText>
                Mostrando {start}–{end} de {data.total}
              </StatusText>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={page <= 1 || result.isFetching}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={page >= totalPages || result.isFetching}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </>
        )}

        {data && !result.isError && data.items.length === 0 && (
          <StatusText className="mt-6 text-center">
            No hay canjes para los filtros seleccionados.
          </StatusText>
        )}
      </PageCard>

      {opened && (
        <RedemptionDetailModal
          redemption={opened}
          now={now}
          onClose={() => setOpenCode(null)}
          onApply={closeForAction}
          onReject={closeForAction}
        />
      )}
    </Page>
  )
}
